/**
 * Stubbed authentication API.
 * All calls simulate a 1500ms network delay.
 * Will be replaced with real Axios calls to localhost:8080 later.
 */

export function register(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Basic validation stub
      if (!data.email || !data.password || !data.fullName) {
        reject({ message: "All fields are required." });
        return;
      }
      resolve({
        email: data.email,
        fullName: data.fullName,
        token: "mock-token-" + Date.now(),
      });
    }, 1500);
  });
}

export function login(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!data.email || !data.password) {
        reject({ message: "Email and password are required." });
        return;
      }
      // Simulate wrong credentials for a specific email
      if (data.email === "wrong@example.com") {
        reject({ message: "Invalid email or password." });
        return;
      }
      resolve({
        email: data.email,
        token: "mock-token-" + Date.now(),
      });
    }, 1500);
  });
}
