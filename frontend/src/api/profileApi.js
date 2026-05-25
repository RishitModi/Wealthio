/**
 * Stubbed profile API.
 * Simulates a 1500ms network delay.
 * Will be replaced with real Axios calls to localhost:8080 later.
 */

export function saveProfile(data, token) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!token) {
        reject({ message: "Authentication required." });
        return;
      }
      resolve({ success: true });
    }, 1500);
  });
}
