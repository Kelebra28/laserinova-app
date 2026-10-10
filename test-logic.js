const initialData = {
  project: "Bolígrafos Grabados Stevia",
  material: "Bolígrafo de aluminio Stevia",
  w: 5, h: 0.3, qty: 100,
  type: "RESALE",
  desc: "..."
};
const initType = initialData.type || "CORTE";
console.log("initType is:", initType);
const concept = { type: initType };
console.log("Concept type is:", concept.type);
console.log("Is CORTE?", concept.type === "CORTE");
console.log("Is RESALE?", concept.type === "RESALE");
