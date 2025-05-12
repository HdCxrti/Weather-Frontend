// script.js using WeatherAPI.com
let apiKey = "2a5acc31061d47ceb11144716251205";
let units = localStorage.getItem("units") || "F";
let lastCity = localStorage.getItem("lastCity") || "Martinsburg";
let currentOverlay = "temp_new";

async function fetchWeather(city) {
  showLoader(true);
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(
        city
      )}&days=7&aqi=no&alerts=no`
    );
    if (!res.ok) {
      const errData = await res.json();
      console.error("WeatherAPI error:", errData);
      throw new Error(errData.error?.message || "City not found");
    }

    const data = await res.json();

    updateUI(data);
    updateMap(data.location.lat, data.location.lon, data);
    updateWeatherOverlay(currentOverlay);
    lastCity = city;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    alert(error.message || "City not found. Please try again.");
  } finally {
    showLoader(false);
  }
}

function searchCity() {
  const city = document.getElementById("cityInput").value.trim();
  if (city) {
    console.log("Searching for city:", city);
    fetchWeather(city);
    localStorage.setItem("lastCity", city);
  }
}

function updateUI(data) {
  const greeting = getGreeting();
  document.getElementById(
    "location"
  ).textContent = `${greeting}, ${data.location.name}, ${data.location.region}`;
  document.getElementById("description").textContent =
    data.current.condition.text;
  document.getElementById("temperature").textContent =
    units === "F"
      ? `${data.current.temp_f}°F (Feels like ${data.current.feelslike_f}°F)`
      : `${data.current.temp_c}°C (Feels like ${data.current.feelslike_c}°C)`;
  document.getElementById("details").textContent =
    units === "F"
      ? `Humidity: ${data.current.humidity}% | Wind: ${data.current.wind_mph} mph`
      : `Humidity: ${data.current.humidity}% | Wind: ${data.current.wind_kph} kph`;

  document.getElementById("wind").textContent =
    units === "F"
      ? `${data.current.wind_mph} mph`
      : `${data.current.wind_kph} kph`;
  document.getElementById("uv").textContent = data.current.uv;
  const sunrise = data.forecast.forecastday[0].astro.sunrise;
  const sunset = data.forecast.forecastday[0].astro.sunset;
  document.getElementById("sun").textContent = `${sunrise} / ${sunset}`;

  const forecastContainer = document.getElementById("forecast");
  forecastContainer.innerHTML = "";

  data.forecast.forecastday.forEach((day) => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
    const iconUrl = `https:${day.day.condition.icon}`;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h4>${dayName}</h4>
      <img src="${iconUrl}" alt="${
      day.day.condition.text
    }" style="width: 40px; height: 40px;" />
      <p><small>${day.day.condition.text}</small></p>
<p>
  <strong>
    ${
      units === "F"
        ? `${Math.round(day.day.maxtemp_f)}°F`
        : `${Math.round(day.day.maxtemp_c)}°C`
    }
  </strong>
  /
  ${
    units === "F"
      ? `${Math.round(day.day.mintemp_f)}°F`
      : `${Math.round(day.day.mintemp_c)}°C`
  }
</p>

      ${
        units === "F"
          ? `${Math.round(day.day.mintemp_f)}°F - ${Math.round(
              day.day.maxtemp_f
            )}°F`
          : `${Math.round(day.day.mintemp_c)}°C - ${Math.round(
              day.day.maxtemp_c
            )}°C`
      }
    `;
    forecastContainer.appendChild(card);
  });

  setBackground(data.current.condition.text);
}

function setBackground(condition) {
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 18;
  const lower = condition.toLowerCase();
  let bg = "";

  if (lower.includes("sunny")) bg = isNight ? "sunny-night.avif" : "sunny.avif";
  else if (lower.includes("cloud"))
    bg = isNight ? "cloudy-night.avif" : "cloudy.avif";
  else if (lower.includes("rain"))
    bg = isNight ? "rain-night.avif" : "rain.avif";
  else if (lower.includes("snow"))
    bg = isNight ? "snow-night.avif" : "snow.avif";
  else if (lower.includes("fog") || lower.includes("mist"))
    bg = isNight ? "fog-night.avif" : "fog.avif";
  else bg = isNight ? "default-night.avif" : "default.avif";

  document.body.style.opacity = "0";
  setTimeout(() => {
    document.body.style.backgroundImage = `url('images/${bg}')`;
    document.body.style.opacity = "1";
  }, 200);
}

function showLoader(isLoading) {
  const loader = document.getElementById("loader");
  if (!loader) return;
  loader.style.display = isLoading ? "flex" : "none";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getWeatherFromLocation() {
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
    () => fetchWeather(lastCity)
  );
}

function toggleUnits() {
  units = units === "F" ? "C" : "F";
  localStorage.setItem("units", units);
  document.getElementById("unitToggle").textContent = `Switch to ${
    units === "F" ? "°C" : "°F"
  }`;
  fetchWeather(lastCity);
}

function updateMap(lat, lon, data) {
  if (window.weatherMap && typeof window.weatherMap.setView === "function") {
    window.weatherMap.setView([lat, lon], 8);
    if (window.weatherMarker)
      window.weatherMap.removeLayer(window.weatherMarker);
    const icon = `https:${data.current.condition.icon}`;
    const popupContent = `<strong>${
      data.location.name
    }</strong><br><img src='${icon}' style='width:30px;height:30px;'><br>${
      units === "F" ? data.current.temp_f + "°F" : data.current.temp_c + "°C"
    }<br>${data.current.condition.text}`;
    window.weatherMarker = L.marker([lat, lon])
      .addTo(window.weatherMap)
      .bindPopup(popupContent)
      .openPopup();
    return;
  }

  window.weatherMap = L.map("weatherMap").setView([lat, lon], 8);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(window.weatherMap);

  const icon = `https:${data.current.condition.icon}`;
  const popupContent = `<strong>${
    data.location.name
  }</strong><br><img src='${icon}' style='width:30px;height:30px;'><br>${
    units === "F" ? data.current.temp_f + "°F" : data.current.temp_c + "°C"
  }<br>${data.current.condition.text}`;
  window.weatherMarker = L.marker([lat, lon])
    .addTo(window.weatherMap)
    .bindPopup(popupContent)
    .openPopup();
}

function updateWeatherOverlay(layer) {
  currentOverlay = layer;
  if (!window.weatherMap) return;

  if (window.weatherOverlay) {
    window.weatherMap.removeLayer(window.weatherOverlay);
  }

  window.weatherOverlay = L.tileLayer(
    `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=ebb11342bd7e48d0971141239251205`,
    {
      maxZoom: 19,
      opacity: 0.5,
      attribution: "Weather overlay © OpenWeather",
    }
  );

  window.weatherOverlay.addTo(window.weatherMap);
}

function setupOverlaySelector() {
  const select = document.getElementById("overlaySelect");
  if (select) {
    select.addEventListener("change", (e) => {
      updateWeatherOverlay(e.target.value);
    });
  }

  const resetBtn = document.getElementById("resetLocation");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.removeItem("lastCity");
      getWeatherFromLocation();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupOverlaySelector();
  getWeatherFromLocation();
});
