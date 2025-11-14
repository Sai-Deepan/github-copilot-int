document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityTemplate = document.getElementById("activity-template");

  function initialsFromEmail(email) {
    const local = (email || "").split("@")[0] || "";
    const parts = local.split(/[\.\-_]/).filter(Boolean);
    const initials = (parts.length > 1 ? parts.map(p => p[0]) : [local[0], local[1] || ""])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return initials || "?";
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message / previous content
      activitiesList.innerHTML = "";

      // Reset select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const frag = activityTemplate.content.cloneNode(true);
        frag.querySelector(".activity-title").textContent = name;
        frag.querySelector(".activity-desc").textContent = details.description;
        frag.querySelector(".activity-schedule").innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;
        const spotsLeft = details.max_participants - details.participants.length;
        frag.querySelector(".activity-capacity").innerHTML = `<strong>Capacity:</strong> ${details.participants.length}/${details.max_participants} — ${spotsLeft} spots left`;

        const participantsList = frag.querySelector(".participants-list");
        participantsList.innerHTML = "";

        if (!details.participants || details.participants.length === 0) {
          const li = document.createElement("li");
          li.className = "participant-item";
          li.textContent = "No participants yet.";
          participantsList.appendChild(li);
        } else {
          details.participants.forEach((email) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const avatar = document.createElement("span");
            avatar.className = "participant-avatar";
            avatar.textContent = initialsFromEmail(email);

            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = email;

            li.appendChild(avatar);
            li.appendChild(emailSpan);
            participantsList.appendChild(li);
          });
        }

        activitiesList.appendChild(frag);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities to show updated participants and availability
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize
  fetchActivities();
});
