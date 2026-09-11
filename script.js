document.addEventListener("DOMContentLoaded", () => {
  // 1. FAQ ACCORDION
  const questions = document.querySelectorAll(".faq-question");

  questions.forEach((question) => {
    question.addEventListener("click", () => {
      const answer = question.nextElementSibling;
      const isOpen = answer.classList.contains("open");

      document.querySelectorAll(".faq-answer.open").forEach((item) => {
        item.classList.remove("open");
      });

      document.querySelectorAll(".faq-question.active").forEach((item) => {
        item.classList.remove("active");
      });

      if (!isOpen) {
        answer.classList.add("open");
        question.classList.add("active");
      }
    });
  });

  // 2. CRONÔMETRO REGRESSIVO (15 MINUTOS)
  const countdownElement = document.getElementById("countdown");
  let totalSeconds = 15 * 60;

  function updateTimer() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");

    if (countdownElement) {
      countdownElement.textContent = `${formattedMinutes}:${formattedSeconds}`;
    }

    if (totalSeconds > 0) {
      totalSeconds--;
    } else {
      totalSeconds = 15 * 60;
    }
  }

  updateTimer();
  setInterval(updateTimer, 1000);

  // 3. ATUALIZAÇÃO DINÂMICA DE ESCASSEZ DE ESTOQUE
  const stockCount = document.getElementById("stock-count");
  let currentStock = 7;

  // Reduz levemente o estoque a cada 45 segundos para aumentar urgência
  setInterval(() => {
    if (currentStock > 2) {
      currentStock--;
      if (stockCount) {
        stockCount.textContent = `Apenas ${currentStock} restantes`;
      }
    }
  }, 45000);

  // 4. POP-UP DINÂMICO DE COMPRA RECENTE (PROVA SOCIAL)
  const salesPopup = document.getElementById("sales-popup");
  const popupName = document.getElementById("popup-name");
  const popupInitials = document.getElementById("popup-initials");
  const popupTimeAgo = document.getElementById("popup-time-ago");
  const popupClose = document.getElementById("popup-close");

  const buyers = [
    { name: "Lucas M.", initials: "LM" },
    { name: "Mariana K.", initials: "MK" },
    { name: "Gabriel S.", initials: "GS" },
    { name: "Beatriz A.", initials: "BA" },
    { name: "Felipe T.", initials: "FT" },
    { name: "Camila R.", initials: "CR" },
    { name: "Thiago P.", initials: "TP" },
    { name: "Larissa V.", initials: "LV" },
    { name: "Rafael C.", initials: "RC" },
    { name: "Fernanda O.", initials: "FO" },
    { name: "Eduardo B.", initials: "EB" },
    { name: "Patricia L.", initials: "PL" }
  ];

  const timesAgo = ["1 min", "2 min", "3 min", "agora mesmo", "4 min"];
  let popupTimeout;

  function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function showRandomNotification() {
    const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
    const randomTime = timesAgo[Math.floor(Math.random() * timesAgo.length)];

    if (popupName && popupInitials && popupTimeAgo) {
      popupName.textContent = randomBuyer.name;
      popupInitials.textContent = randomBuyer.initials;
      popupTimeAgo.textContent = randomTime;
    }

    salesPopup.classList.remove("hidden");

    setTimeout(() => {
      salesPopup.classList.add("hidden");
      scheduleNextNotification();
    }, 5000);
  }

  function scheduleNextNotification() {
    const randomDelay = getRandomNumber(12, 22) * 1000;
    popupTimeout = setTimeout(showRandomNotification, randomDelay);
  }

  if (popupClose) {
    popupClose.addEventListener("click", () => {
      salesPopup.classList.add("hidden");
      clearTimeout(popupTimeout);
      scheduleNextNotification();
    });
  }

  setTimeout(showRandomNotification, 6000);
});