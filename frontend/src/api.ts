/**
 * RecipeGenie Frontend API Client
 * Centralized interface and HTTP methods with JWT Authorization and per-user data isolation.
 */

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface Recipe {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  calories?: number;
  cooking_time?: number;
  servings?: number;
  cuisine?: string;
  diet?: string;
  allergies?: string[];
  use_first?: string[];
  estimated_food_saved_grams?: number;
  substitutions?: string[];
  created_at: string;
}

export interface GenerateParams {
  ingredients: string[];
  diet: "veg" | "non-veg" | "vegan" | "jain" | "vrat";
  cuisine: string;
  max_time: number;
  servings: number;
  allergies?: string[];
  use_first?: string[];
}

export interface Stats {
  total_recipes: number;
  total_grams_saved: number;
  total_favorites: number;
}

export interface DetectIngredientsResponse {
  ingredients: string[];
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Handle API responses with informative error extraction and automatic session expiry handling.
 */
async function handleResponse<T>(res: Response, endpoint = ""): Promise<T> {
  if (res.status === 401) {
    // If unauthorized on protected endpoint, clear session and dispatch notification
    if (!endpoint.includes("/auth/login") && !endpoint.includes("/auth/register")) {
      localStorage.removeItem("recipegenie_token");
      window.dispatchEvent(new CustomEvent("recipegenie:session-ended"));
    }
  }

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      errorDetail = res.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

/**
 * Helper to get default headers with Authorization Bearer token attached.
 */
function getAuthHeaders(isJson = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  const token = localStorage.getItem("recipegenie_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ============================================================================
// Authentication API Calls
// ============================================================================

/**
 * Register a new user account.
 */
export async function registerUser(params: RegisterParams): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse<AuthResponse>(res, "/auth/register");
}

/**
 * Sign in to an existing account.
 */
export async function loginUser(params: LoginParams): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse<AuthResponse>(res, "/auth/login");
}

/**
 * Get current authenticated user details from Bearer token.
 */
export async function getMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(false),
  });
  return handleResponse<User>(res, "/auth/me");
}

// ============================================================================
// Protected Recipe & Cooking API Calls
// ============================================================================

/**
 * Generate a new recipe using provided ingredients, dietary preferences, and expiry prioritization.
 */
export async function generateRecipe(params: GenerateParams): Promise<Recipe> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify(params),
  });
  return handleResponse<Recipe>(res, "/generate");
}

/**
 * Detect food ingredients from an uploaded image file (fridge photo).
 */
export async function detectIngredients(imageFile: File): Promise<string[]> {
  const formData = new FormData();
  formData.append("image", imageFile);

  const headers = getAuthHeaders(false);

  const res = await fetch(`${API_BASE}/detect-ingredients`, {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await handleResponse<DetectIngredientsResponse>(res, "/detect-ingredients");
  return data.ingredients;
}

/**
 * Retrieve user's aggregated cooking statistics.
 */
export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: getAuthHeaders(false),
  });
  return handleResponse<Stats>(res, "/stats");
}

/**
 * Retrieve user's recipe history (newest first).
 */
export async function getRecipes(): Promise<Recipe[]> {
  const res = await fetch(`${API_BASE}/recipes`, {
    headers: getAuthHeaders(false),
  });
  return handleResponse<Recipe[]>(res, "/recipes");
}

/**
 * Retrieve a single recipe by its unique ID.
 */
export async function getRecipeById(id: number): Promise<Recipe> {
  const res = await fetch(`${API_BASE}/recipes/${id}`, {
    headers: getAuthHeaders(false),
  });
  return handleResponse<Recipe>(res, `/recipes/${id}`);
}

/**
 * Retrieve user's favorited recipes.
 */
export async function getFavorites(): Promise<Recipe[]> {
  const res = await fetch(`${API_BASE}/favorites`, {
    headers: getAuthHeaders(false),
  });
  return handleResponse<Recipe[]>(res, "/favorites");
}

/**
 * Bookmark a recipe to user's favorites.
 */
export async function addFavorite(recipeId: number): Promise<{ message: string; recipe_id: number }> {
  const res = await fetch(`${API_BASE}/favorites/${recipeId}`, {
    method: "POST",
    headers: getAuthHeaders(false),
  });
  return handleResponse<{ message: string; recipe_id: number }>(res, `/favorites/${recipeId}`);
}

/**
 * Remove a recipe from user's favorites.
 */
export async function removeFavorite(recipeId: number): Promise<{ message: string; recipe_id: number }> {
  const res = await fetch(`${API_BASE}/favorites/${recipeId}`, {
    method: "DELETE",
    headers: getAuthHeaders(false),
  });
  return handleResponse<{ message: string; recipe_id: number }>(res, `/favorites/${recipeId}`);
}

/**
 * Check backend health status (public).
 */
export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse<{ status: string }>(res, "/health");
}
