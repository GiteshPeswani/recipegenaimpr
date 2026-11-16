from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    """SQLAlchemy model representing a registered user / chef."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    recipes = relationship("Recipe", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")


class Recipe(Base):
    """SQLAlchemy model representing generated recipes belonging to a user."""
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    ingredients = Column(JSON, nullable=False)
    steps = Column(JSON, nullable=False)
    calories = Column(Integer, nullable=True)
    cooking_time = Column(Integer, nullable=True)
    servings = Column(Integer, nullable=True)
    cuisine = Column(String(100), nullable=True)
    diet = Column(String(50), nullable=True)
    allergies = Column(JSON, nullable=True, default=list)
    use_first = Column(JSON, nullable=True, default=list)
    estimated_food_saved_grams = Column(Integer, default=0, nullable=True)
    substitutions = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="recipes")
    favorites = relationship("Favorite", back_populates="recipe", cascade="all, delete-orphan")


class Favorite(Base):
    """SQLAlchemy model representing bookmarked favorite recipes per user."""
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "recipe_id", name="uq_user_recipe"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    saved_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="favorites")
    recipe = relationship("Recipe", back_populates="favorites")
