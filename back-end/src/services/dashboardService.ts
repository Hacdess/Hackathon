import { categoryRepository } from '../repositories/categoryRepository'
import { productRepository } from '../repositories/productRepository'
import type {
  DashboardActivity,
  DashboardMovementBar,
  DashboardResponse,
  DashboardStat,
} from '../types/domain'

const LOW_STOCK_THRESHOLD = 10

function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function dayLabel(value: Date) {
  return value.toLocaleDateString('en-US', { weekday: 'short' })
}

function relativeTime(timestamp: string) {
  const now = Date.now()
  const target = new Date(timestamp).getTime()
  const diffMinutes = Math.max(1, Math.round((now - target) / 60000))

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardResponse> {
    const [products, categories] = await Promise.all([
      productRepository.findAll(),
      categoryRepository.findAll(),
    ])

    const now = new Date()
    const todayStart = startOfDay(now)
    const last7DaysStart = new Date(todayStart)
    last7DaysStart.setDate(todayStart.getDate() - 6)
    const previous7DaysStart = new Date(todayStart)
    previous7DaysStart.setDate(todayStart.getDate() - 13)

    const productsCreatedThisWeek = products.filter(
      (product) => new Date(product.createdAt) >= last7DaysStart,
    ).length
    const productsCreatedPreviousWeek = products.filter((product) => {
      const createdAt = new Date(product.createdAt)
      return createdAt >= previous7DaysStart && createdAt < last7DaysStart
    }).length
    const categoriesCreatedThisMonth = categories.filter((category) => {
      const createdAt = new Date(category.createdAt)
      return (
        createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
      )
    }).length
    const unitsInStock = products.reduce((total, product) => total + product.stock, 0)
    const lowStockProducts = products.filter((product) => product.stock <= LOW_STOCK_THRESHOLD)

    const stats: DashboardStat[] = [
      {
        label: 'Total products',
        value: products.length,
        delta: `${productsCreatedThisWeek} new this week`,
      },
      {
        label: 'Categories',
        value: categories.length,
        delta: `${categoriesCreatedThisMonth} new this month`,
      },
      {
        label: 'Units in stock',
        value: unitsInStock,
        delta: `${Math.round(unitsInStock / Math.max(products.length, 1))} avg / item`,
      },
      {
        label: 'Low stock alerts',
        value: lowStockProducts.length,
        delta: lowStockProducts.length > 0 ? 'items' : null,
        danger: lowStockProducts.length > 0,
      },
    ]

    const movement: DashboardMovementBar[] = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(last7DaysStart)
      day.setDate(last7DaysStart.getDate() + index)
      const nextDay = new Date(day)
      nextDay.setDate(day.getDate() + 1)

      const incoming = products.filter((product) => {
        const createdAt = new Date(product.createdAt)
        return createdAt >= day && createdAt < nextDay
      }).length

      const outgoing = products.filter((product) => {
        const updatedAt = new Date(product.updatedAt)
        const createdAt = new Date(product.createdAt)
        return updatedAt >= day && updatedAt < nextDay && updatedAt.getTime() !== createdAt.getTime()
      }).length

      return {
        label: dayLabel(day),
        incoming,
        outgoing,
      }
    })

    const activities: DashboardActivity[] = [
      ...products.map((product) => ({
        title:
          new Date(product.updatedAt).getTime() !== new Date(product.createdAt).getTime()
            ? `Updated product: ${product.name}`
            : `Added new item: ${product.name}`,
        meta:
          new Date(product.updatedAt).getTime() !== new Date(product.createdAt).getTime()
            ? `${relativeTime(product.updatedAt)} • SKU ${product.sku}`
            : `${relativeTime(product.createdAt)} • SKU ${product.sku}`,
        icon:
          new Date(product.updatedAt).getTime() !== new Date(product.createdAt).getTime()
            ? 'solar:pen-bold'
            : 'solar:add-square-bold',
        tone:
          new Date(product.updatedAt).getTime() !== new Date(product.createdAt).getTime()
            ? 'bg-slate-100 text-slate-600'
            : 'bg-blue-50 text-blue-600',
        timestamp:
          new Date(product.updatedAt).getTime() !== new Date(product.createdAt).getTime()
            ? product.updatedAt
            : product.createdAt,
      })),
      ...categories.map((category) => ({
        title: `Created category: ${category.name}`,
        meta: `${relativeTime(category.createdAt)} • Inventory classification`,
        icon: 'solar:folder-with-files-bold',
        tone: 'bg-emerald-50 text-emerald-600',
        timestamp: category.createdAt,
      })),
      ...lowStockProducts.map((product) => ({
        title: `Low stock: ${product.name}`,
        meta: `${product.stock} unit${product.stock === 1 ? '' : 's'} left • Needs replenishment`,
        icon: 'solar:danger-circle-bold',
        tone: 'bg-red-50 text-red-600',
        timestamp: product.updatedAt,
      })),
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 6)

    if (productsCreatedPreviousWeek > productsCreatedThisWeek) {
      stats[0] = {
        ...stats[0],
        delta: `${productsCreatedThisWeek} new this week`,
      }
    }

    return {
      stats,
      movement,
      activities,
    }
  },
}
