import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from .database import get_db
from . import models
from .schemas import (
    UserRegister,
    UserLogin,
    UserOut,
    TokenResponse,
    GenerateRequest,
    RecipeOut,
    DetectedIngredientsOut,
    StatsOut,
)
from . import gemini_service
from .auth import hash_password, verify_password, create_access_token, get_current_user

logger = logging.getLogger("recipegenie.routes")

router = APIRouter()

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


# ============================================================================
# Authentication Endpoints (Public)
# ============================================================================

@router.post(
    "/auth/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user / chef",
    description="Registers a new user, hashes password with bcrypt, and issues a JWT token. Returns 409 if email already registered."
)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account with email uniqueness check and secure password hashing."""
    # Check if email is already taken
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        logger.warning(f"Registration attempted with existing email: {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A cook with this email is already registered. Please sign in instead."
        )

    # Hash the password with bcrypt
    hashed = hash_password(payload.password)

    # Create and persist new user
    new_user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hashed
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT access token
    token = create_access_token(new_user.id)
    logger.info(f"Registered new user ID {new_user.id} ({new_user.email})")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post(
    "/auth/login",
    response_model=TokenResponse,
    summary="Authenticate and sign in user",
    description="Authenticates user with email and password, returning a JWT Bearer token."
)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user credentials and issue a signed JWT token."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning(f"Failed login attempt for email: {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)
    logger.info(f"User ID {user.id} ({user.email}) logged in successfully.")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get(
    "/auth/me",
    response_model=UserOut,
    summary="Get current authenticated user profile",
    description="Returns the profile of the user identified by the Bearer token."
)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Return the currently authenticated user's details."""
    return current_user


# ============================================================================
# Protected Recipe & Kitchen Endpoints (Per-User Isolation)
# ============================================================================

@router.post(
    "/generate",
    response_model=RecipeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new AI recipe for current user",
    description="Generates an authentic recipe via Gemini and saves it linked to the authenticated user."
)
def generate_recipe_endpoint(
    request: GenerateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate recipe tailored for user, ensuring non-empty ingredients and user-linked persistence."""
    cleaned_ingredients = [item.strip() for item in request.ingredients if item and item.strip()]
    if not cleaned_ingredients:
        logger.warning("Empty ingredients list provided in /generate request.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ingredients list cannot be empty. Please provide at least one ingredient."
        )

    request.ingredients = cleaned_ingredients

    try:
        generated = gemini_service.generate_recipe(request)
    except Exception as e:
        logger.error(f"Failed to generate recipe with Gemini: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {str(e)}"
        )

    try:
        db_recipe = models.Recipe(
            user_id=current_user.id,
            title=generated.title,
            description=generated.description,
            ingredients=generated.ingredients,
            steps=generated.steps,
            calories=generated.calories,
            cooking_time=generated.cooking_time,
            servings=generated.servings,
            cuisine=generated.cuisine,
            diet=generated.diet,
            allergies=request.allergies,
            use_first=request.use_first,
            estimated_food_saved_grams=generated.estimated_food_saved_grams,
            substitutions=generated.substitutions,
        )
        db.add(db_recipe)
        db.commit()
        db.refresh(db_recipe)
        logger.info(f"Persisted recipe ID {db_recipe.id} for user ID {current_user.id}.")
        return db_recipe
    except Exception as db_err:
        db.rollback()
        logger.error(f"Database error while saving recipe: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save recipe into the database."
        )


@router.post(
    "/detect-ingredients",
    response_model=DetectedIngredientsOut,
    summary="Detect food ingredients from an image",
    description="Upload a photo (fridge/ingredients); Gemini Vision identifies food items (lowercase, deduplicated)."
)
async def detect_ingredients_endpoint(
    image: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    """Protected endpoint to detect food ingredients from an uploaded image file."""
    content_type = image.content_type or ""
    if not content_type.startswith("image/"):
        logger.warning(f"Invalid file content type: {content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image (e.g. image/jpeg, image/png)."
        )

    contents = await image.read()

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty."
        )
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file size exceeds the 5MB limit ({len(contents)} bytes received)."
        )

    try:
        ingredients = gemini_service.detect_ingredients_from_image(contents, content_type)
        return {"ingredients": ingredients}
    except Exception as e:
        logger.error(f"Error in vision ingredient detection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini vision ingredient detection failed: {str(e)}"
        )


@router.get(
    "/recipes",
    response_model=List[RecipeOut],
    summary="Get user's generated recipes",
    description="Returns list of all recipes belonging to the current user, newest first."
)
def get_recipes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all recipes belonging to the authenticated user."""
    recipes = (
        db.query(models.Recipe)
        .filter(models.Recipe.user_id == current_user.id)
        .order_by(models.Recipe.created_at.desc())
        .all()
    )
    return recipes


@router.get(
    "/recipes/{id}",
    response_model=RecipeOut,
    summary="Get a single recipe by ID",
    description="Returns detailed recipe information if it belongs to current user. Returns 404 otherwise."
)
def get_recipe_by_id(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve a single recipe ensuring ownership (returns 404 if missing or belonging to someone else)."""
    recipe = (
        db.query(models.Recipe)
        .filter(models.Recipe.id == id, models.Recipe.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recipe with id {id} not found."
        )
    return recipe


@router.get(
    "/favorites",
    response_model=List[RecipeOut],
    summary="Get user's favorited recipes",
    description="Returns list of recipes bookmarked by the current user, ordered by save date."
)
def get_favorites(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve favorited recipes bookmarked by the authenticated user."""
    favorited_recipes = (
        db.query(models.Recipe)
        .join(models.Favorite, models.Recipe.id == models.Favorite.recipe_id)
        .filter(models.Favorite.user_id == current_user.id)
        .order_by(models.Favorite.saved_at.desc())
        .all()
    )
    return favorited_recipes


@router.post(
    "/favorites/{recipe_id}",
    summary="Add a recipe to user's favorites",
    description="Bookmarks a recipe into user's favorites. Returns 404 if recipe missing or not owned by user."
)
def add_favorite(
    recipe_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a recipe to the current user's favorites list."""
    # Ensure recipe exists and belongs to the user
    recipe = (
        db.query(models.Recipe)
        .filter(models.Recipe.id == recipe_id, models.Recipe.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recipe with id {recipe_id} does not exist."
        )

    # Check if already favorited by this user
    existing = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.recipe_id == recipe_id)
        .first()
    )
    if existing:
        return {"message": "Recipe already in favorites", "recipe_id": recipe_id}

    new_fav = models.Favorite(user_id=current_user.id, recipe_id=recipe_id)
    db.add(new_fav)
    db.commit()
    logger.info(f"User ID {current_user.id} added recipe {recipe_id} to favorites.")
    return {"message": "Recipe added to favorites", "recipe_id": recipe_id}


@router.delete(
    "/favorites/{recipe_id}",
    summary="Remove a recipe from user's favorites",
    description="Removes a recipe from current user's favorites."
)
def remove_favorite(
    recipe_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a recipe from the current user's favorites list."""
    fav = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.recipe_id == recipe_id)
        .first()
    )
    if fav:
        db.delete(fav)
        db.commit()
        logger.info(f"User ID {current_user.id} removed recipe {recipe_id} from favorites.")
        return {"message": "Recipe removed from favorites", "recipe_id": recipe_id}

    return {"message": "Recipe was not in favorites", "recipe_id": recipe_id}


@router.get(
    "/stats",
    response_model=StatsOut,
    summary="Get user's cooking & food saved statistics",
    description="Returns total recipes generated, total grams of food saved, and total favorites for the current user."
)
def get_cooking_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate aggregated platform stats for current user."""
    total_recipes = (
        db.query(func.count(models.Recipe.id))
        .filter(models.Recipe.user_id == current_user.id)
        .scalar() or 0
    )
    total_grams = (
        db.query(func.sum(models.Recipe.estimated_food_saved_grams))
        .filter(models.Recipe.user_id == current_user.id)
        .scalar() or 0
    )
    total_favs = (
        db.query(func.count(models.Favorite.id))
        .filter(models.Favorite.user_id == current_user.id)
        .scalar() or 0
    )
    return {
        "total_recipes": int(total_recipes),
        "total_grams_saved": int(total_grams),
        "total_favorites": int(total_favs),
    }
