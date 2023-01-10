const API_URL = "https://api.jikan.moe/v4/anime";

const input = document.querySelector(".search__input");

const results = document.querySelector(".search__result");
const resultsList = results.querySelector(".search__list");
const resStatus = results.querySelector(".search__status");

const content = document.querySelector(".content");
const poster = content.querySelector(".content__poster");
const titleAnime = content.querySelector(".content__title");
const description = content.querySelector(".content__description");

const history = document.querySelector(".history");
const historyList = history.querySelector(".history__list");

// функция для отправки запросов на сервер. При ошибки прокидывает ответ ошибки в ближайший catch
const getData = async (url) => {
    const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
    });

    const result = await response.json();

    if (response.ok) {
        return result;
    }

    throw result; // сможем вынести имя ошибки в блоке catch
};

// обращаемся к серверу за нужными аниме, учитывая максимально нужное количество (count)
const search = async (searchText, count) => {
    const searchData = await getData(
        `${API_URL}?limit=${count}&letter=${searchText}`
    );
    return searchData.data;
};

// заполняем данными аниме контентную область
const setResultData = async (id) => {
    const result = await getData(`${API_URL}/${id}`);
    content.classList.add("visible");
    poster.setAttribute("src", result.data.images.jpg.image_url);
    poster.setAttribute("alt", result.data.title);
    titleAnime.textContent = result.data.title;
    description.innerText = result.data.synopsis;
};

// добавляем в локалсторадж данные саджеста
const addToLocalStorage = (title, mal_id) => {
    let history = JSON.parse(window.localStorage.getItem("history"));

    if (history) {
        history = history.filter((item) => item.mal_id !== mal_id);
        history = [{ title, mal_id }, ...history];
    } else {
        history = [{ title, mal_id }];
    }

    try {
        window.localStorage.setItem("history", JSON.stringify(history));
    } catch {
        console.log(
            "Для разработчиков: Произошла ошибка при добавлении записи в localStorage"
        );
    }

    updateHistory();
};

// колбэк для клика по саджесту (добавим в локал сторадж и отобразим данные). Принимает ноду саджеста
const handleClickSuggest = (node) => {
    resultsList.classList.remove("visible");
    addToLocalStorage(node.textContent, node.dataset.mal_id);
    setResultData(node.dataset.mal_id);
    input.value = node.textContent;
};

// добавляем саджесты и вешаем обработчики на них
const addToSearchList = (data) => {
    if (data?.length > 0) {
        data.forEach((item) => {
            const listItem = document.createElement("li");
            listItem.classList.add("search__item");
            listItem.dataset.mal_id = item.mal_id;
            listItem.textContent = item.title;
            resultsList.appendChild(listItem);
            listItem.addEventListener("click", (e) =>
                handleClickSuggest(e.target)
            );
        });
        resultsList.classList.add("visible");
        resStatus.classList.remove("visible");
    } else {
        resStatus.innerText =
            "Ничего не найдено :( Попробуйте искать на английском!";
        resultsList.classList.remove("visible");
    }
};

// добавляет саджесты из истории в общий список
const addHistoryToSearchList = (history) => {
    if (history.length > 0) {
        history.forEach((item, i) => {
            if (i < 5) {
                const listItem = document.createElement("li");
                listItem.className = "search__item search__item_history";
                listItem.dataset.mal_id = item.mal_id;
                listItem.textContent = item.title;
                resultsList.appendChild(listItem);
                listItem.addEventListener("click", (e) =>
                    handleClickSuggest(e.target)
                );
            }
        });
        resultsList.insertAdjacentHTML(
            "beforeend",
            '<li class="search__history-divider"></li>'
        );
    }
};

// колбэк для события input у поля поиска
const handleSearch = async (e) => {
    const { value } = e.target;
    if (value) {
        results.classList.add("visible");
        resultsList.classList.remove("visible");
        resStatus.textContent = "Идёт поиск, пожалуйста подождите...";
        resStatus.classList.add("visible");

        const searchHistory =
            JSON.parse(window.localStorage.getItem("history")) || [];
        const historyMatch = searchHistory.filter((item) =>
            item.title.toLowerCase().startsWith(value.toLowerCase())
        );
        const searchCount =
            historyMatch.length <= 5 ? 10 - historyMatch.length : 5;
        resultsList.innerHTML = "";

        addHistoryToSearchList(historyMatch);

        try {
            const result = await search(value, searchCount);
            addToSearchList(result);
        } catch (err) {
            resStatus.textContent = err.message;
        }
    } else {
        results.classList.remove("visible");
        resultsList.classList.remove("visible");
        resStatus.classList.remove("visible");
    }
};

// для обновления истории результатов на странице.
// нижний блок с историей, при загрузке сайта и при добавлении новой записи в localStorage
const updateHistory = () => {
    let searchHistory = JSON.parse(window.localStorage.getItem("history"));
    historyList.innerHTML = "";

    if (searchHistory) {
        for (let i = 0; i < 3; i++) {
            const current = searchHistory[i];
            if (current) {
                const historyItem = document.createElement("li");
                historyItem.classList.add("history__item");
                historyItem.dataset.mal_id = current.mal_id;
                historyItem.textContent = current.title;
                historyList.appendChild(historyItem);
                historyItem.addEventListener("click", (event) => {
                    setResultData(event.target.dataset.mal_id);
                    input.value = event.target.innerText;
                });
            } else {
                break;
            }
        }
        history.classList.add("visible");
    } else {
        history.classList.remove("visible");
    }
};

// честно стырена отсюда https://doka.guide/js/debounce/
function debounce(callee, timeoutMs) {
    return function perform(...args) {
        let previousCall = this.lastCall;
        this.lastCall = Date.now();

        if (previousCall && this.lastCall - previousCall <= timeoutMs) {
            clearTimeout(this.lastCallTimer);
        }

        this.lastCallTimer = setTimeout(() => callee(...args), timeoutMs);
    };
}

// Основной скрипт, который обрабатываем ввод в поле поиска и загружает историю при старте.
(async () => {
    updateHistory();

    const handleSearchDebounce = debounce(handleSearch, 500);
    input.addEventListener("input", handleSearchDebounce);

    // и подпишемся на любые изменения стораджа
    window.addEventListener("storage", updateHistory);
})();
