const status = document.querySelector("#status");
const errors = {
  invalid_oauth_state: "THE LOGIN SESSION EXPIRED. TRY AGAIN.",
  missing_scope: "GITHUB WRITE ACCESS WAS NOT GRANTED.",
  not_collaborator: "THIS ACCOUNT IS NOT A PROJECT COLLABORATOR.",
  github_oauth_failed: "GITHUB LOGIN FAILED. TRY AGAIN."
};
status.textContent = errors[new URLSearchParams(location.search).get("error")] || "";
