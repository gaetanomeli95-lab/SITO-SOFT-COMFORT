export const productSchema = {
  id: '',
  supplier: '',
  sourceUrl: '',
  category: '',
  title: '',
  subtitle: '',
  description: '',
  technicalFeatures: {
    materials: '',
    finishes: [],
    dimensions: '',
    modularity: '',
    notes: []
  },
  images: [],
  tags: [],
  scrapedAt: ''
};

export const createProduct = (overrides = {}) => ({
  ...productSchema,
  technicalFeatures: {
    ...productSchema.technicalFeatures,
    ...(overrides.technicalFeatures || {})
  },
  images: overrides.images || [],
  tags: overrides.tags || [],
  ...overrides,
  scrapedAt: overrides.scrapedAt || new Date().toISOString()
});
