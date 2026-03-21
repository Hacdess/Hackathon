const websiteGuide = [
  'Dashboard is the main overview page for store health and recent activity.',
  'Products is where the seller reviews inventory items and saved product records.',
  'Categories helps group products under business-friendly inventory classifications.',
  'The Add Product page contains the fields name, SKU, category, description, sale price, and initial stock.',
]

const vietnamTaxGuide = [
  'Only provide high-level operational guidance and remind the seller to verify official legal details.',
  'Focus on invoices, VAT-related record keeping, stock records, product mapping, and supporting documents.',
  'Avoid making up specific legal conclusions, tax rates, or deadlines when uncertain.',
]

export const assistantKnowledgeRepository = {
  getWebsiteGuide() {
    return websiteGuide
  },
  getVietnamTaxGuide() {
    return vietnamTaxGuide
  },
}
