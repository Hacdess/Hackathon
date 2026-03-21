import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { apiFetch } from '../lib/api'
import type { Category } from '../lib/api'

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiFetch<Category[]>('/api/categories')
        setCategories(response)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load categories.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadCategories()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      const category = await apiFetch<Category>('/api/categories', {
        method: 'POST',
        body: { name, description },
      })

      setCategories((currentCategories) => [category, ...currentCategories])
      setName('')
      setDescription('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create category.')
    }
  }

  const handleDelete = async (categoryId: string) => {
    try {
      await apiFetch<{ message: string }>(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })
      setCategories((currentCategories) =>
        currentCategories.filter((category) => category.id !== categoryId),
      )
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete category.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-10">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black tracking-tight text-[#0f1724]">
            Product categories
          </h1>
          <p className="mt-2 text-slate-500">Organize the product catalog by grouping related inventory.</p>
        </div>
      </header>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="font-heading text-xl font-bold text-[#0f1724]">Create category</h2>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                placeholder="Electronics"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                placeholder="What belongs in this category?"
              />
            </div>

            <button className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition hover:scale-[1.01]">
              Save category
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm md:col-span-2">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm md:col-span-2">
              No categories yet. Create one from the form.
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon icon="solar:folder-with-files-bold" className="text-3xl" />
                  </div>
                  <button
                    onClick={() => void handleDelete(category.id)}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
                  >
                    <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                  </button>
                </div>
                <h3 className="font-heading text-xl font-bold text-[#0f1724]">{category.name}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {category.description || 'No description yet.'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
