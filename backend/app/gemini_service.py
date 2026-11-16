import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import ClientError, APIError
from .schemas import GenerateRequest, RecipeGenerated, DetectedIngredientsOut

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger("recipegenie.gemini")

# Fallback models in case default model is unavailable or sunset
PRIMARY_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
FALLBACK_MODEL = "gemini-3-flash-preview"


def get_gemini_client() -> genai.Client:
    """Initialize and return the official Google GenAI client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment or .env file.")
    return genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})


def _build_prompt(request: GenerateRequest) -> str:
    """Construct a detailed Indian kitchen-first prompt enforcing ingredients, diet, allergy, expiry, and substitutions."""
    ingredients_str = ", ".join(request.ingredients)
    use_first_str = ", ".join(request.use_first) if request.use_first else "None specified"
    allergies_str = ", ".join(request.allergies) if request.allergies else "None"

    prompt_lines = [
        "You are an experienced Indian home cook and master chef.",
        "Create an authentic, practical, and flavorful recipe suited for everyday kitchen cooking.\n",
        f"- Available Ingredients: {ingredients_str}",
        f"- Priority 'Use Soon' Ingredients (Expiring): {use_first_str}",
        f"- Dietary Requirement: {request.diet.upper()}",
        f"- Allergies To Strictly Avoid: {allergies_str}",
        f"- Regional Cuisine Style: {request.cuisine}",
        f"- Maximum Cooking Time: {request.max_time} minutes",
        f"- Servings: {request.servings}\n",
        "STRICT CULINARY RULES:",
        "1. Indian Kitchen Authenticity: Use traditional Indian cooking utensils (kadhai, tawa, pressure cooker, tadka pan) and methods (tadka/tempering, slow bhunai, steaming, roasting). If regional cuisine is 'Sindhi', embrace authentic Sindhi flavors and staples (e.g., Sindhi Kadhi with besan and tamarind/kokum, Aloo Tuk twice-crisped style, Sai Bhaji, Koki flatbread with anardana, Bhuga caramelized saute, or Seyun Patata).",
        "2. Indian Measurements & Names: Use Indian measurements where appropriate (e.g., 1 katori, 1-2 tsp, 1 tbsp, a pinch/chutki). Refer to standard spices by their Indian culinary names (haldi, jeera, rai/mustard seeds, hing, dhaniya powder, garam masala, kasuri methi, amchur, lal mirch).",
        "3. Expiry Priority (Use-First): If 'Use Soon' ingredients are provided, you MUST prioritize them as the hero elements of the recipe and use them in meaningful quantities so they do not spoil.",
        "4. Strict Diet Compliance:",
        "   - If 'jain': Strictly NO onion, NO garlic, NO root vegetables (no aloo/potatoes, carrots, radish, ginger/adrak, beetroot). Even if onion or root vegetables appear in the available ingredients, you MUST EXCLUDE THEM.",
        "   - If 'vrat': Strictly NO grains (no wheat/atta, rice, maida, suji, oats), NO onion, NO garlic. Use ONLY sendha namak (rock salt). Use fasting-safe ingredients only (sabudana, rajgira, kuttu, singhara, makhana, potatoes, peanuts, curd).",
        "   - If 'veg': Strictly no meat, poultry, fish, seafood, or eggs.",
        "   - If 'vegan': Strictly no animal products (no meat, dairy, paneer, ghee, curd, butter, honey).",
        "5. Allergy Restrictions: Strictly avoid any allergen marked in the allergies list. If 'nuts' is avoided, no peanuts, cashews/kaju, almonds, etc. If 'dairy' is avoided, no milk, paneer, butter, ghee, curd/dahi, malai. If 'gluten' is avoided, no wheat, atta, maida, suji, or compounded hing.",
        "6. Food Saved Estimation: Estimate realistic total weight in grams of the prioritized 'use_first' ingredients actually used in the recipe (e.g., 200g of paneer + 100g of capsicum = 300). If no use_first ingredients are marked, estimate weight of perishable main vegetables/proteins saved (e.g. 150-350g). Return an integer.",
        "7. Substitutions: Provide 2 to 3 commonly missing ingredients for this recipe and simple everyday Indian kitchen substitutes in the format 'missing ingredient -> alternative' (e.g. 'dahi -> malai + squeeze of nimbu', 'kasuri methi -> fresh chopped coriander', 'paneer -> tofu or boiled potatoes').",
        "8. Steps: Keep preparation steps clear, numbered, and organized in chronological cooking order.",
        "9. Output: Must strictly conform to the JSON schema."
    ]
    return "\n".join(prompt_lines)


def _call_gemini_model(client: genai.Client, model: str, prompt: str) -> str:
    """Execute generate_content call against Gemini API enforcing JSON schema output."""
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RecipeGenerated,
        temperature=0.7,
    )
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=config
    )
    if not response or not response.text:
        raise ValueError("Gemini returned an empty response.")
    return response.text


def generate_recipe(request: GenerateRequest) -> RecipeGenerated:
    """
    Generate a validated recipe using Google Gemini API.
    Enforces JSON output adhering to RecipeGenerated schema.
    Includes automatic retry on invalid JSON and model fallback if necessary.
    """
    client = get_gemini_client()
    prompt = _build_prompt(request)
    
    # Try primary model; if sunset/unavailable (404), fall back to backup model
    active_model = PRIMARY_MODEL
    logger.info(f"Generating recipe with model: {active_model} for ingredients: {request.ingredients}")

    last_error = None
    # Maximum 2 attempts (initial + 1 automatic retry on failure / invalid JSON)
    for attempt in range(1, 3):
        try:
            try:
                raw_text = _call_gemini_model(client, active_model, prompt)
            except ClientError as ce:
                # If primary model is no longer available to new users, switch to fallback model
                if "not found" in str(ce).lower() or "no longer available" in str(ce).lower():
                    logger.warning(f"Model {active_model} returned {ce}. Falling back to {FALLBACK_MODEL}.")
                    active_model = FALLBACK_MODEL
                    raw_text = _call_gemini_model(client, active_model, prompt)
                else:
                    raise ce

            # Validate generated JSON against Pydantic schema
            data = json.loads(raw_text)
            validated_recipe = RecipeGenerated.model_validate(data)
            logger.info(f"Recipe '{validated_recipe.title}' generated and validated successfully on attempt {attempt}.")
            return validated_recipe

        except (json.JSONDecodeError, ValueError) as parse_err:
            last_error = parse_err
            logger.warning(f"Invalid JSON/validation error on attempt {attempt}: {parse_err}. Retrying once...")
            # Append explicit repair instruction for retry attempt
            prompt += "\n\nCRITICAL: Return strictly raw, valid JSON conforming exactly to the RecipeGenerated schema without markdown formatting."
        except Exception as e:
            last_error = e
            logger.error(f"Error calling Gemini API on attempt {attempt}: {e}")
            if attempt == 1:
                logger.info("Retrying Gemini generation once...")
            else:
                break

    raise RuntimeError(f"Gemini recipe generation failed after retry: {last_error}")


def detect_ingredients_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[str]:
    """
    Analyze image using Gemini Vision to detect visible raw/prepared food ingredients.
    Returns a clean, lowercase, deduplicated list of food item strings.
    """
    client = get_gemini_client()
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    prompt = (
        "Analyze this image of food ingredients, refrigerator contents, or groceries.\n"
        "Identify and list all visible raw or cooked food ingredients, vegetables, fruits, meats, dairy products, herbs, and edible staples.\n\n"
        "Strict Rules:\n"
        "1. Identify food and ingredient items only. Ignore plates, cutting boards, packaging, containers, refrigerators, shelves, or utensils.\n"
        "2. Keep ingredient names simple and recognizable (e.g. 'tomato', 'egg', 'onion', 'milk', 'cheddar cheese', 'butter', 'carrot').\n"
        "3. Every ingredient name must be in lowercase only.\n"
        "4. Remove duplicates.\n"
        "5. Output must adhere strictly to the JSON schema."
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=DetectedIngredientsOut,
        temperature=0.2,
    )

    active_model = PRIMARY_MODEL
    logger.info(f"Detecting ingredients with vision model: {active_model} (mime: {mime_type})")

    for attempt in range(1, 3):
        try:
            try:
                response = client.models.generate_content(
                    model=active_model,
                    contents=[image_part, prompt],
                    config=config
                )
            except ClientError as ce:
                if "not found" in str(ce).lower() or "no longer available" in str(ce).lower():
                    logger.warning(f"Model {active_model} returned {ce}. Falling back to {FALLBACK_MODEL}.")
                    active_model = FALLBACK_MODEL
                    response = client.models.generate_content(
                        model=active_model,
                        contents=[image_part, prompt],
                        config=config
                    )
                else:
                    raise ce

            if not response or not response.text:
                return []

            data = json.loads(response.text)
            validated = DetectedIngredientsOut.model_validate(data)

            # Lowercase, trim whitespace, and deduplicate preserving order
            unique_ingredients: list[str] = []
            seen = set()
            for item in validated.ingredients:
                cleaned = item.strip().lower()
                if cleaned and cleaned not in seen:
                    seen.add(cleaned)
                    unique_ingredients.append(cleaned)

            logger.info(f"Successfully detected {len(unique_ingredients)} ingredients: {unique_ingredients}")
            return unique_ingredients

        except Exception as e:
            logger.error(f"Error during vision detection attempt {attempt}: {e}")
            if attempt == 1:
                logger.info("Retrying vision detection once...")
            else:
                raise RuntimeError(f"Vision ingredient detection failed: {e}")

