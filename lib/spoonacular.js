import axios from "axios";

const API_KEY = "f72dd815408447c99bad98aa404691a1";
export const searchRecipes = async (query, offset = 0) => {
  try {
    const res = await axios.get(
      `https://api.spoonacular.com/recipes/complexSearch`,
      {
        params: {
          apiKey: API_KEY,
          query: query,
          number: 10,      // only load 10 at a time
          offset: offset,  // pagination
          addRecipeInformation: true,
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("Spoonacular error:", err.response?.data || err);
    return { results: [], totalResults: 0 };
  }
};