/* Persona id mapping shared by App and Navbar. Original helper module. */

export function personaForApi(uiPersona) {
  return uiPersona === "researcher" ? "general" : uiPersona || "general";
}

export const PERSONA_LABEL = {
  general: "Citizen",
  farmer: "Farmer",
  disaster_manager: "Disaster Manager",
  aviation: "Aviation",
  marine: "Marine",
  researcher: "Researcher",
};
