const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  try {
    const data = await apiClient.post("https://contact-backend-jfer.onrender.com/api/contact", {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value
    });

    if (data.success) {
      showToast("Message sent successfully ✅", "success");
      form.reset();
    } else {
      showToast(data.message || "Failed to send ❌", "error");
    }

  } catch (err) {
    showToast("Server error ❌", "error");
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Send Message";
});

function showToast(message, type = "success") {
  const toast = domUtils.createElement("div", {
    className: `toast ${type}`,
    textContent: message
  });

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}