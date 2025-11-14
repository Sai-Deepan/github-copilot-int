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

  // Update a single activity card in the DOM after a signup (optimistic update)
  function updateActivityDom(activityName, email) {
    const cards = activitiesList.querySelectorAll(".activity-card");
    const card = Array.from(cards).find(c => c.querySelector(".activity-title").textContent === activityName);
    if (!card) return;

    const participantsList = card.querySelector(".participants-list");
    if (!participantsList) return;

    // Remove "No participants yet." placeholder if present
    const firstItem = participantsList.querySelector('.participant-item');
    if (firstItem && firstItem.textContent === 'No participants yet.') {
      participantsList.innerHTML = '';
    }

    // Create participant row (same structure as fetchActivities)
    const li = document.createElement("li");
    li.className = "participant-item";

    const avatar = document.createElement("span");
    avatar.className = "participant-avatar";
    avatar.textContent = initialsFromEmail(email);

    const emailSpan = document.createElement("span");
    emailSpan.className = "participant-email";
    emailSpan.textContent = email;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "participant-delete";
    deleteBtn.setAttribute("aria-label", `Unregister ${email} from ${activityName}`);
    deleteBtn.title = "Unregister";
    deleteBtn.innerHTML = "✖";

    deleteBtn.addEventListener("click", async () => {
      deleteBtn.disabled = true;
      try {
        const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, { method: "DELETE" });
        const data = await resp.json();
        if (resp.ok) {
          messageDiv.textContent = data.message || `${email} unregistered`;
          messageDiv.className = "message success";
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 4000);
          await fetchActivities();
        } else {
          messageDiv.textContent = data.detail || data.message || "Failed to unregister";
          messageDiv.className = "message error";
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 5000);
          deleteBtn.disabled = false;
        }
      } catch (err) {
        console.error("Error unregistering:", err);
        messageDiv.textContent = "Failed to unregister. Please try again.";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
        deleteBtn.disabled = false;
      }
    });

    li.appendChild(avatar);
    li.appendChild(emailSpan);
    li.appendChild(deleteBtn);
    participantsList.appendChild(li);

    // Update capacity text if present (increment participant count)
    const capEl = card.querySelector('.activity-capacity');
    if (capEl) {
      // Expect format like: "Capacity: X/Y — Z spots left" or similar
      const text = capEl.textContent || '';
      const m = text.match(/(\d+)\/(\d+)/);
      if (m) {
        const current = parseInt(m[1], 10);
        const max = parseInt(m[2], 10);
        const newCurrent = Math.min(current + 1, max);
        const spotsLeft = Math.max(max - newCurrent, 0);
        capEl.innerHTML = `<strong>Capacity:</strong> ${newCurrent}/${max} — ${spotsLeft} spots left`;
      }
    }
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

            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "participant-delete";
            deleteBtn.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            deleteBtn.title = "Unregister";
            deleteBtn.innerHTML = "✖";

            // Wire up unregister action
            deleteBtn.addEventListener("click", async () => {
              // Optimistically disable the button to avoid double clicks
              deleteBtn.disabled = true;
              try {
                const resp = await fetch(`/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(email)}`, { method: "DELETE" });
                const data = await resp.json();
                if (resp.ok) {
                  // show success message and refresh activities
                  messageDiv.textContent = data.message || `${email} unregistered`;
                  messageDiv.className = "message success";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 4000);
                  await fetchActivities();
                } else {
                  messageDiv.textContent = data.detail || data.message || "Failed to unregister";
                  messageDiv.className = "message error";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                  deleteBtn.disabled = false;
                }
              } catch (err) {
                console.error("Error unregistering:", err);
                messageDiv.textContent = "Failed to unregister. Please try again.";
                messageDiv.className = "message error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 5000);
                deleteBtn.disabled = false;
              }
            });

            li.appendChild(avatar);
            li.appendChild(emailSpan);
            li.appendChild(deleteBtn);
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

        // Optimistically update the UI for the specific activity so users don't need a full refresh
        try {
          updateActivityDom(activity, email);
        } catch (err) {
          console.error('Error doing optimistic update:', err);
        }

        // Refresh activities to reconcile with server state
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
