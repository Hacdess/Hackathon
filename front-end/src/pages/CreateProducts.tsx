import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { Link, useNavigate } from 'react-router-dom'
import { useAssistant } from '../context/AssistantContext'
import { apiFetch } from '../lib/api'
import type { Category, Product } from '../lib/api'

export default function CreateProductPage() {
  const navigate = useNavigate()
  const { productDraft, clearProductDraft } = useAssistant()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiSyncMessage, setAiSyncMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiFetch<Category[]>('/api/categories')
        setCategories(response)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load categories.')
      }
    }

    void loadCategories()
  }, [])

  useEffect(() => {
    if (!productDraft) {
      return
    }

    setName((current) => productDraft.name || current)
    setSku((current) => productDraft.sku || current)
    setDescription((current) => productDraft.description || current)
    setPrice((current) => (productDraft.price !== null ? String(productDraft.price) : current))
    setStock((current) => (productDraft.stock !== null ? String(productDraft.stock) : current))

    if (productDraft.categoryName) {
      const matchedCategory = categories.find(
        (category) => category.name.toLowerCase() === productDraft.categoryName.toLowerCase(),
      )

      if (matchedCategory) {
        setCategoryId(matchedCategory.id)
      }
    }

    const missingFields = [
      !productDraft.name.trim() ? 'name' : null,
      !productDraft.sku.trim() ? 'SKU' : null,
      !productDraft.categoryName.trim() ? 'category' : null,
      !productDraft.description.trim() ? 'description' : null,
      productDraft.price === null ? 'sale price' : null,
      productDraft.stock === null ? 'initial stock' : null,
    ].filter(Boolean) as string[]

    setAiSyncMessage(
      missingFields.length === 0
        ? 'The AI assistant filled the form. Please review the values and confirm them with the agent.'
        : `The AI assistant filled part of the form. Please confirm the captured values and provide the missing ${missingFields.join(
            ', ',
          )}.`,
    )
  }, [categories, productDraft])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await apiFetch<Product>('/api/products', {
        method: 'POST',
        body: {
          name,
          sku,
          description,
          price: Number(price),
          stock: Number(stock),
          categoryId: categoryId || null,
        },
      })

      navigate('/products')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-10">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        <Link to="/products" className="transition-colors hover:text-primary">
          Products
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" className="text-lg" />
        <span className="text-primary">Create new product</span>
      </nav>

      <div className="mb-10">
        <h1 className="font-heading text-4xl font-black tracking-tight text-[#0f1724]">
          Add a new product
        </h1>
        <p className="mt-2 text-slate-500">
          Provide the core details and starting stock information for the new item.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {productDraft ? (
        <div className="mb-6 rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                AI draft synced
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {aiSyncMessage ??
                  'The assistant extracted product details from your conversation and synced them into the form.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearProductDraft}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="col-span-2 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 font-heading text-xl font-bold text-[#0f1724]">Basic information</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Product name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  placeholder="Example: MacBook Pro 14-inch M3 Pro"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    SKU
                  </label>
                  <input
                    value={sku}
                    onChange={(event) => setSku(event.target.value)}
                    type="text"
                    placeholder="APP-MBP14-M3P"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Write a short description for the product."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 font-heading text-xl font-bold text-[#0f1724]">Pricing and stock</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sale price
                </label>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2499"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Initial stock
                </label>
                <input
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="10"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 font-heading text-xl font-bold text-[#0f1724]">Checklist</h2>
            <div className="space-y-4 text-sm text-slate-500">
              <div className="flex items-center gap-3">
                <Icon icon="solar:box-bold" className="text-primary" />
                Basic product details
              </div>
              <div className="flex items-center gap-3">
                <Icon icon="solar:layers-linear" className="text-primary" />
                Starting inventory
              </div>
              <div className="flex items-center gap-3">
                <Icon icon="solar:pen-linear" className="text-primary" />
                Pricing review
              </div>
              <div className="flex items-center gap-3">
                <Icon icon="solar:user-check-linear" className="text-primary" />
                Confirm AI-filled values
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 font-heading text-xl font-bold text-[#0f1724]">Actions</h2>
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Saving product...' : 'Save product'}
              </button>
              <Link
                to="/products"
                className="block w-full rounded-2xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </section>
        </aside>
      </form>
    </div>
  )
}
