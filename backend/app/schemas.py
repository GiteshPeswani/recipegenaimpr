import re
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator


class UserRegister(BaseModel):
    """Payload for registering a new user / chef."""
    name: str = Field(..., min_length=1, max_length=100, description="User's full or display name")
    email: str = Field(..., description="Unique email address")
    password: str = Field(..., min_length=8, description="Password (at least 8 characters)")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Name cannot be empty.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        # Basic RFC 5322 compliant email regex check
        email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        if not re.match(email_regex, clean):
            raise ValueError("That email doesn't look right. Please provide a valid email.")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password needs at least 8 characters.")
        return v


class UserLogin(BaseModel):
    """Payload for logging into an existing account."""
    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(BaseModel):
    """Public representation of a user."""
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """JWT authentication token response payload."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class GenerateRequest(BaseModel):
    """Input payload for generating a recipe based on ingredients, Indian preferences, and expiry awareness."""
    ingredients: List[str] = Field(..., description="List of available ingredients")
    diet: Literal["veg", "non-veg", "vegan", "jain", "vrat"] = Field("veg", description="Dietary preference")
    cuisine: str = Field("Any", description="Preferred regional cuisine style")
    max_time: int = Field(30, ge=5, le=180, description="Maximum cooking time in minutes")
    servings: int = Field(2, ge=1, le=20, description="Number of servings")
    allergies: List[str] = Field(default_factory=list, description="List of allergens to strictly avoid (e.g. nuts, dairy, gluten)")
    use_first: List[str] = Field(default_factory=list, description="Expiring ingredients to prioritize and use meaningfully")


class RecipeGenerated(BaseModel):
    """Schema enforced on Gemini structured JSON generation."""
    title: str = Field(..., description="Catchy Indian/regional title of the recipe")
    description: str = Field(..., description="Appetizing summary of the dish mentioning its cooking style")
    ingredients: List[str] = Field(..., description="Full list of ingredients with Indian/metric measurements (katori, tbsp, tsp)")
    steps: List[str] = Field(..., description="Numbered, clear sequential preparation steps using Indian utensils (kadhai, tawa, pressure cooker)")
    calories: int = Field(..., description="Estimated calories per serving as an integer")
    cooking_time: int = Field(..., description="Estimated cooking time in minutes")
    servings: int = Field(..., description="Number of servings")
    cuisine: str = Field(..., description="Cuisine style")
    diet: str = Field(..., description="Dietary classification: veg, non-veg, vegan, jain, or vrat")
    estimated_food_saved_grams: int = Field(0, description="Estimated grams of food saved from use_first ingredients")
    substitutions: List[str] = Field(default_factory=list, description="2 to 3 substitutions in 'missing -> alternative' format")


class RecipeOut(BaseModel):
    """Public output representation of a persisted recipe."""
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    ingredients: List[str]
    steps: List[str]
    calories: Optional[int] = None
    cooking_time: Optional[int] = None
    servings: Optional[int] = None
    cuisine: Optional[str] = None
    diet: Optional[str] = None
    allergies: Optional[List[str]] = None
    use_first: Optional[List[str]] = None
    estimated_food_saved_grams: Optional[int] = 0
    substitutions: Optional[List[str]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StatsOut(BaseModel):
    """Summary statistics for food saved and recipe creation."""
    total_recipes: int
    total_grams_saved: int
    total_favorites: int


class DetectedIngredientsOut(BaseModel):
    """Output schema for ingredients recognized from an uploaded fridge photo."""
    ingredients: List[str] = Field(..., description="Deduplicated lowercase list of detected food ingredients")
