let currentLang = localStorage.getItem("nutriworld_lang") || "ru";

const languageSelect = document.getElementById("languageSelect");

function initLanguageSelect() {
  if (!languageSelect) return;

  languageSelect.innerHTML = Object.entries(languages)
    .map(([code, label]) => `<option value="${code}">${label}</option>`)
    .join("");

  languageSelect.value = currentLang;

  languageSelect.addEventListener("change", () => {
    currentLang = languageSelect.value;
    localStorage.setItem("nutriworld_lang", currentLang);
    location.reload();
  });
}

function getLocalized(obj) {
  return obj?.[currentLang] || obj?.en || obj?.ru || "";
}

function getMealName(meal) {
  return meals?.[meal]?.[currentLang] || meals?.[meal]?.ru || meal;
}

function getDiaryKey(date) {
  return `nutriworld_diary_${date}`;
}

function getDiary(date) {
  return JSON.parse(localStorage.getItem(getDiaryKey(date)) || "[]");
}

function saveDiary(date, diary) {
  localStorage.setItem(getDiaryKey(date), JSON.stringify(diary));
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getProfileTargetCalories() {
  const profile = JSON.parse(localStorage.getItem("nutriworld_profile") || "null");
  if (!profile) return null;

  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const activity = Number(profile.activity);

  if (!age || !height || !weight || !activity) return null;

  const bmr =
    profile.gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * activity;

  if (profile.goal === "lose") return Math.round(tdee * 0.85);
  if (profile.goal === "gain") return Math.round(tdee * 1.1);
  return Math.round(tdee);
}

/* PROFILE + CALCULATOR */

const calorieForm = document.getElementById("calorieForm");
const result = document.getElementById("result");

function loadProfile() {
  if (!calorieForm) return;
  const profile = JSON.parse(localStorage.getItem("nutriworld_profile") || "null");
  if (!profile) return;

  ["gender", "age", "height", "weight", "activity", "goal"].forEach((key) => {
    const el = document.getElementById(key);
    if (el && profile[key]) el.value = profile[key];
  });
}

function calculateProfile() {
  if (!calorieForm || !result) return;

  const gender = document.getElementById("gender").value;
  const age = Number(document.getElementById("age").value);
  const height = Number(document.getElementById("height").value);
  const weight = Number(document.getElementById("weight").value);
  const activity = Number(document.getElementById("activity").value);
  const goal = document.getElementById("goal").value;

  if (!age || !height || !weight) return;

  let bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * activity;
  const targetCalories =
    goal === "lose" ? tdee * 0.85 : goal === "gain" ? tdee * 1.1 : tdee;

  const protein = weight * 1.6;
  const fat = weight * 0.8;
  const carbs = (targetCalories - protein * 4 - fat * 9) / 4;

  localStorage.setItem(
    "nutriworld_profile",
    JSON.stringify({ gender, age, height, weight, activity, goal })
  );

  result.classList.remove("hidden");
  result.innerHTML = `
    <h3>Ваш результат сохранён</h3>
    <div class="result-grid">
      <div class="result-item"><span>BMR</span><strong>${Math.round(bmr)}</strong></div>
      <div class="result-item"><span>TDEE</span><strong>${Math.round(tdee)}</strong></div>
      <div class="result-item"><span>Калории</span><strong>${Math.round(targetCalories)}</strong></div>
      <div class="result-item"><span>Белки</span><strong>${Math.round(protein)} г</strong></div>
      <div class="result-item"><span>Жиры</span><strong>${Math.round(fat)} г</strong></div>
      <div class="result-item"><span>Углеводы</span><strong>${Math.max(0, Math.round(carbs))} г</strong></div>
    </div>
  `;
}

if (calorieForm) {
  loadProfile();

  if (localStorage.getItem("nutriworld_profile")) {
    calculateProfile();
  }

  calorieForm.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateProfile();
  });
}

/* FOOD SEARCH */

const foodSearchInput = document.getElementById("foodSearchInput");
const cuisineFilter = document.getElementById("cuisineFilter");
const suggestions = document.getElementById("suggestions");
const selectedFoodBox = document.getElementById("selectedFood");
const popularFoods = document.getElementById("popularFoods");

let selectedFood = null;

function getAllFoods() {
  const customFoods = JSON.parse(localStorage.getItem("nutriworld_custom_foods") || "[]");
  return [...baseFoods, ...customFoods];
}

function renderCuisineFilter() {
  if (!cuisineFilter) return;

  const cuisines = [...new Set(getAllFoods().map((food) => getLocalized(food.cuisine)))];

  cuisineFilter.innerHTML = `
    <option value="all">Все кухни</option>
    ${cuisines.map((cuisine) => `<option value="${cuisine}">${cuisine}</option>`).join("")}
  `;
}

function renderPopularFoods() {
  if (!popularFoods) return;

  popularFoods.innerHTML = getAllFoods()
    .slice(0, 8)
    .map((food) => {
      return `
        <button class="popular-chip" onclick="selectFood('${food.id}')">
          ${food.icon || "🍽️"} ${getLocalized(food.name)}
        </button>
      `;
    })
    .join("");
}

function searchFoods() {
  if (!foodSearchInput || !suggestions) return;

  const query = foodSearchInput.value.toLowerCase().trim();
  const cuisine = cuisineFilter?.value || "all";

  if (!query) {
    suggestions.classList.add("hidden");
    suggestions.innerHTML = "";
    return;
  }

  const results = getAllFoods()
    .filter((food) => {
      const localizedName = getLocalized(food.name).toLowerCase();
      const allNames = Object.values(food.name || {}).join(" ").toLowerCase();
      const aliases = (food.aliases || []).join(" ").toLowerCase();

      const matchesText =
        localizedName.includes(query) || allNames.includes(query) || aliases.includes(query);

      const matchesCuisine = cuisine === "all" || getLocalized(food.cuisine) === cuisine;

      return matchesText && matchesCuisine;
    })
    .slice(0, 10);

  renderSuggestions(results);
}

function renderSuggestions(list) {
  if (!suggestions) return;

  if (list.length === 0) {
    suggestions.classList.remove("hidden");
    suggestions.innerHTML = `<div class="empty">Ничего не найдено</div>`;
    return;
  }

  suggestions.classList.remove("hidden");
  suggestions.innerHTML = list
    .map((food) => {
      return `
        <div class="suggestion-item" onclick="selectFood('${food.id}')">
          <div class="food-icon">${food.icon || "🍽️"}</div>
          <div>
            <div class="suggestion-title">${getLocalized(food.name)}</div>
            <div class="suggestion-meta">${getLocalized(food.cuisine)} · ${food.calories} ккал / 100 г</div>
          </div>
          <div class="suggestion-meta">+</div>
        </div>
      `;
    })
    .join("");
}

function selectFood(foodId) {
  selectedFood = getAllFoods().find((food) => food.id === foodId);
  if (!selectedFood || !selectedFoodBox) return;

  if (suggestions) suggestions.classList.add("hidden");
  if (foodSearchInput) foodSearchInput.value = getLocalized(selectedFood.name);

  selectedFoodBox.classList.remove("hidden");

  selectedFoodBox.innerHTML = `
    <div class="selected-food-head">
      <div class="food-icon">${selectedFood.icon || "🍽️"}</div>
      <div>
        <h3>${getLocalized(selectedFood.name)}</h3>
        <div class="food-meta">
          <div class="tag">${getLocalized(selectedFood.cuisine)}</div>
          <div class="tag">100 г</div>
        </div>
      </div>
    </div>

    <div class="nutrition">
      <div><span>Калории</span><strong>${selectedFood.calories}</strong></div>
      <div><span>Белки</span><strong>${selectedFood.protein} г</strong></div>
      <div><span>Жиры</span><strong>${selectedFood.fat} г</strong></div>
      <div><span>Углеводы</span><strong>${selectedFood.carbs} г</strong></div>
    </div>

    <div class="add-diary-box">
      <label>
        Граммы
        <input type="number" id="selectedGrams" value="100" min="1"/>
      </label>

      <label>
        Приём пищи
        <select id="selectedMeal">
          <option value="breakfast">${getMealName("breakfast")}</option>
          <option value="lunch">${getMealName("lunch")}</option>
          <option value="dinner">${getMealName("dinner")}</option>
          <option value="snack">${getMealName("snack")}</option>
        </select>
      </label>

      <button onclick="addFoodToDiary()">Добавить</button>
    </div>
  `;
}

function addFoodToDiary() {
  if (!selectedFood) return;

  const grams = Number(document.getElementById("selectedGrams").value);
  const meal = document.getElementById("selectedMeal").value;

  if (!grams) return;

  const today = getTodayDate();
  const diary = getDiary(today);

  diary.push({
    id: Date.now(),
    foodId: selectedFood.id,
    name: selectedFood.name,
    cuisine: selectedFood.cuisine,
    icon: selectedFood.icon || "🍽️",
    meal,
    grams,
    calories: Math.round((selectedFood.calories / 100) * grams),
    protein: Math.round((selectedFood.protein / 100) * grams),
    fat: Math.round((selectedFood.fat / 100) * grams),
    carbs: Math.round((selectedFood.carbs / 100) * grams)
  });

  saveDiary(today, diary);
  alert("Блюдо добавлено");
}

if (foodSearchInput) foodSearchInput.addEventListener("input", searchFoods);
if (cuisineFilter) cuisineFilter.addEventListener("change", searchFoods);

/* CUSTOM FOOD */

const customFoodForm = document.getElementById("customFoodForm");

if (customFoodForm) {
  customFoodForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("customName").value.trim();
    const cuisine = document.getElementById("customCuisine").value.trim();
    const calories = Number(document.getElementById("customCalories").value);
    const protein = Number(document.getElementById("customProtein").value) || 0;
    const fat = Number(document.getElementById("customFat").value) || 0;
    const carbs = Number(document.getElementById("customCarbs").value) || 0;

    if (!name || !calories) return;

    const customFood = {
      id: `custom_${Date.now()}`,
      icon: "🍽️",
      name: { ru: name, en: name, zh: name },
      cuisine: { ru: cuisine || "Своя кухня", en: cuisine || "Custom cuisine", zh: cuisine || "自定义" },
      category: "custom",
      calories,
      protein,
      fat,
      carbs,
      aliases: [name.toLowerCase()]
    };

    const customFoods = JSON.parse(localStorage.getItem("nutriworld_custom_foods") || "[]");
    customFoods.push(customFood);

    localStorage.setItem("nutriworld_custom_foods", JSON.stringify(customFoods));

    customFoodForm.reset();
    renderCuisineFilter();
    renderPopularFoods();
    alert("Блюдо сохранено");
  });
}

/* DIARY PAGE */

const diaryDateInput = document.getElementById("diaryDate");
const diaryList = document.getElementById("diaryList");
const diaryTotal = document.getElementById("diaryTotal");
const clearDiaryBtn = document.getElementById("clearDiaryBtn");
const todayBtn = document.getElementById("todayBtn");
const yesterdayBtn = document.getElementById("yesterdayBtn");
const profileTarget = document.getElementById("profileTarget");

function renderDiaryPage(date) {
  if (!diaryList || !diaryTotal) return;

  const diary = getDiary(date);
  const target = getProfileTargetCalories();

  const totals = diary.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.fat += item.fat;
      acc.carbs += item.carbs;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  if (profileTarget) {
    if (target) {
      const percent = Math.min(100, Math.round((totals.calories / target) * 100));
      profileTarget.innerHTML = `
        Цель: ${target} ккал · съедено: ${totals.calories} ккал · осталось: ${Math.max(0, target - totals.calories)} ккал
        <div class="progress-wrap"><div class="progress-bar" style="width:${percent}%"></div></div>
      `;
    } else {
      profileTarget.innerHTML = `Сначала сохраните профиль на странице калькулятора, чтобы видеть цель по калориям.`;
    }
  }

  diaryTotal.innerHTML = `
    <div class="diary-total-grid">
      <div class="total-item"><span>Калории</span><strong>${totals.calories}</strong></div>
      <div class="total-item"><span>Белки</span><strong>${totals.protein} г</strong></div>
      <div class="total-item"><span>Жиры</span><strong>${totals.fat} г</strong></div>
      <div class="total-item"><span>Углеводы</span><strong>${totals.carbs} г</strong></div>
    </div>
  `;

  if (diary.length === 0) {
    diaryList.innerHTML = `<div class="empty">За этот день записей нет</div>`;
    return;
  }

  const mealOrder = ["breakfast", "lunch", "dinner", "snack"];

  diaryList.innerHTML = mealOrder
    .map((meal) => {
      const items = diary.filter((item) => (item.meal || "snack") === meal);

      if (items.length === 0) return "";

      return `
        <div class="meal-group">
          <h3 class="meal-title">${getMealName(meal)}</h3>

          ${items
            .map((item) => {
              return `
                <div class="diary-item">
                  <div>
                    <strong>${item.icon || "🍽️"} ${getLocalized(item.name)}</strong>
                    <span>${item.grams} г · ${getLocalized(item.cuisine)}</span>
                  </div>

                  <div>
                    <strong>${item.calories} ккал</strong>
                    <span>${item.protein}Б / ${item.fat}Ж / ${item.carbs}У</span>
                  </div>

                  <button class="delete-entry" onclick="deleteDiaryEntry('${date}', ${item.id})">Удалить</button>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    })
    .join("");
}

function deleteDiaryEntry(date, entryId) {
  const diary = getDiary(date).filter((item) => item.id !== entryId);
  saveDiary(date, diary);
  renderDiaryPage(date);
}

if (diaryDateInput) {
  diaryDateInput.value = getTodayDate();
  renderDiaryPage(diaryDateInput.value);

  diaryDateInput.addEventListener("change", () => {
    renderDiaryPage(diaryDateInput.value);
  });
}

if (todayBtn) {
  todayBtn.addEventListener("click", () => {
    diaryDateInput.value = getTodayDate();
    renderDiaryPage(diaryDateInput.value);
  });
}

if (yesterdayBtn) {
  yesterdayBtn.addEventListener("click", () => {
    diaryDateInput.value = getYesterdayDate();
    renderDiaryPage(diaryDateInput.value);
  });
}

if (clearDiaryBtn) {
  clearDiaryBtn.addEventListener("click", () => {
    const date = diaryDateInput.value;
    localStorage.removeItem(getDiaryKey(date));
    renderDiaryPage(date);
  });
}

/* START */

initLanguageSelect();
renderCuisineFilter();
renderPopularFoods();
