/**
 * Portfolio template definitions.
 * Each template defines a visual identity: colors, layout style, and preview info.
 * The portfolio pages adapt rendering based on the template's style property.
 */

export const PORTFOLIO_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Gold',
    description: 'Professional gold & black — timeless corporate elegance',
    accentColor: '#F5A623',
    secondaryColor: '#1a1a1a',
    coverBg: '#1a1a1a',
    style: 'classic',
    preview: {
      gradient: 'linear-gradient(135deg, #F5A623, #1a1a1a)',
      cardBg: '#fffaf0',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Modern blue & white — clean and trustworthy',
    accentColor: '#2563EB',
    secondaryColor: '#0f172a',
    coverBg: '#0f172a',
    style: 'modern',
    preview: {
      gradient: 'linear-gradient(135deg, #2563EB, #0f172a)',
      cardBg: '#eff6ff',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Elite',
    description: 'Elegant green & charcoal — sophisticated and premium',
    accentColor: '#059669',
    secondaryColor: '#1a1a1a',
    coverBg: '#1a1a1a',
    style: 'elegant',
    preview: {
      gradient: 'linear-gradient(135deg, #059669, #1a1a1a)',
      cardBg: '#ecfdf5',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson Bold',
    description: 'Bold red & black — high-impact and energetic',
    accentColor: '#DC2626',
    secondaryColor: '#1a1a1a',
    coverBg: '#1a1a1a',
    style: 'bold',
    preview: {
      gradient: 'linear-gradient(135deg, #DC2626, #1a1a1a)',
      cardBg: '#fef2f2',
    },
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    description: 'Rich purple & dark — creative and luxurious',
    accentColor: '#7C3AED',
    secondaryColor: '#1e1b4b',
    coverBg: '#1e1b4b',
    style: 'modern',
    preview: {
      gradient: 'linear-gradient(135deg, #7C3AED, #1e1b4b)',
      cardBg: '#f5f3ff',
    },
  },
  {
    id: 'teal',
    name: 'Teal Fresh',
    description: 'Fresh teal & slate — balanced and approachable',
    accentColor: '#0D9488',
    secondaryColor: '#1e293b',
    coverBg: '#1e293b',
    style: 'elegant',
    preview: {
      gradient: 'linear-gradient(135deg, #0D9488, #1e293b)',
      cardBg: '#f0fdfa',
    },
  },
];

export const getTemplateById = (id) =>
  PORTFOLIO_TEMPLATES.find((t) => t.id === id) || PORTFOLIO_TEMPLATES[0];
