export const PRIORITY_TAGS = {
  themes: [
    'Mapping', 'Toolkit', 'Craft', 'Cultural Identity', 'Intergenerational Practice',
    'Collaboration', 'Community', 'Connection', 'Collective Imagination', 'Culture',
    'Documentation', 'Embodied Knowledge', 'Digital', 'Data Collection', 'Dialogue',
    'Belonging', 'Ecology', 'Sustainability', 'Inclusivity', 'Speculative Futures', '3D Design',
  ],
  design_as: [
    'Relational', 'Participation', 'Research', 'Collaborative', 'Inclusive', 'Facilitation',
    'Decolonial', 'Care', 'Circularity', 'Critical', 'Democratic', 'Discursive', 'Education',
    'Feminism', 'Justice', 'Technology', 'Art',
  ],
  methods: [
    'Storytelling', 'Guided Conversation', 'Ethnography', 'Participatory Mapping', 'Workshop',
    'Interview', 'Audio Recording', 'Autoethnography', 'Collage', 'Creative Writing',
    'Cultural Probes', 'Data Visualization', 'Photography', 'Reflective Practice', 'Co-Design',
    'Collaborative Storytelling', 'Visual Ethnography', 'Critical Making', 'Material Exploration',
    'Co-Creative Practice', 'Cosmological Situating',
  ],
  materials: [
    'Paper', 'Print', 'Binding', 'Thread', 'Screen', 'Clay', 'Fabric', 'Film', 'Ink', 'Marker',
    'Metal', 'Drawing', 'Map', 'Incense', 'Acrylic', 'Electronics', 'Natural Dye', 'Wood',
  ],
};

export function normalizeTag(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const PRIORITY_SETS = Object.fromEntries(
  Object.entries(PRIORITY_TAGS).map(([category, values]) => [
    category,
    new Set(values.map(normalizeTag)),
  ])
);

export function isPriorityTag(category, rawTag) {
  const set = PRIORITY_SETS[category];
  if (!set) return true; // no priority list defined for this category (e.g. collaborators) — unrestricted
  return set.has(normalizeTag(rawTag));
}

export function filterPriorityTags(category, tags) {
  if (!PRIORITY_SETS[category]) return tags || [];
  return (tags || []).filter(t => isPriorityTag(category, t));
}
