export const suppliers = {
  mobilturi: {
    name: 'Mobilturi',
    baseUrl: 'https://www.mobilturi.it/',
    defaultCategory: 'Cucine',
    focus: ['cucine moderne', 'cucine classiche', 'composizioni cucina']
  },
  netcucine: {
    name: 'Netcucine',
    baseUrl: 'https://www.netcucine.it/',
    defaultCategory: 'Cucine',
    focus: ['cucine componibili', 'modelli cucina', 'finiture cucina']
  },
  mcs: {
    name: 'MCS Mobili',
    baseUrl: 'https://www.mcsmobili.com/it/camerette',
    defaultCategory: 'Camerette',
    focus: ['camerette', 'zona notte ragazzi', 'composizioni camerette']
  }
};

export const getSupplier = (supplierKey) => suppliers[supplierKey] || {
  name: supplierKey || 'Fornitore',
  baseUrl: '',
  defaultCategory: '',
  focus: []
};
