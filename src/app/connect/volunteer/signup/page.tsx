import { redirect } from "next/navigation";

// The form had its own page here for a day (23 Oct 2026); it is the Volunteer
// tab itself now. Kept so a shared link still lands on it.
export default function VolunteerSignupRedirect() {
  redirect("/connect/volunteer");
}
