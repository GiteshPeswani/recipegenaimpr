-- RecipeGenie Database Schema with Authentication & User Isolation
-- Run manually if needed: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS recipegenie;
USE recipegenie;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
);

-- 2. Recipes Table (belongs to user)
CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients JSON NOT NULL,
    steps JSON NOT NULL,
    calories INT,
    cooking_time INT,
    servings INT,
    cuisine VARCHAR(100),
    diet VARCHAR(50),
    allergies JSON,
    use_first JSON,
    estimated_food_saved_grams INT DEFAULT 0,
    substitutions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recipes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Favorites Table (per-user bookmarks, unique pair of user_id & recipe_id)
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_recipe UNIQUE (user_id, recipe_id)
);
