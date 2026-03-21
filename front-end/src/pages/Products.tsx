import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import type { Product } from '../lib/api'

function getProductStatus(stock: number) {
  if (stock <= 0) {
    return {
      label: 'Out of stock',
      tone: 'bg-red-50 text-red-600',
    }
  }

  if (stock <= 10) {
    return {
      label: 'Running low',
      tone: 'bg-orange-50 text-orange-600',
    }
  }

  return {
    label: 'Stable',
    tone: 'bg-emerald-50 text-emerald-600',
  }
}

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await apiFetch<Product[]>('/api/products')
        setProducts(response)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load products.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadProducts()
  }, [])

  const handleDelete = async (productId: string) => {
    try {
      await apiFetch<{ message: string }>(`/api/products/${productId}`, {
        method: 'DELETE',
      })
      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productId),
      )
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete product.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-10">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black tracking-tight text-[#0f1724]">
            Product list
          </h1>
          <p className="mt-2 text-slate-500">Manage catalog data and keep inventory up to date.</p>
        </div>
        <Link
          to="/products/new"
          className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Icon icon="hugeicons:add-01" className="text-xl" />
          Create product
        </Link>
      </header>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-[#0f1724]">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Product &amp; SKU
              </th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Category
              </th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Stock
              </th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Price
              </th>
              <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Status
              </th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-8 py-8 text-center text-slate-500">
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-8 text-center text-slate-500">
                  No products yet. Create your first one.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const status = getProductStatus(product.stock)

                return (
                  <tr key={product.id} className="group transition-colors hover:bg-slate-50/50">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0f1724]">{product.name}</span>
                        <span className="text-xs font-medium text-slate-400">{product.sku}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                        {product.category?.name ?? 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-heading text-lg font-black">{product.stock}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold">${product.price.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${status.tone}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all hover:text-primary">
                          <Icon icon="solar:pen-linear" />
                        </button>
                        <button
                          onClick={() => void handleDelete(product.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all hover:text-red-500"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
