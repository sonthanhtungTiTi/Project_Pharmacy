import { useEffect, useState } from 'react'
import productService, { type Category } from '../../services/product.service'

interface CategoryListProps {
  onSelectCategory: (categoryId: string, categoryName: string) => void
  selectedCategoryId: string | null
}

export default function CategoryList({ onSelectCategory, selectedCategoryId }: CategoryListProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    console.log('📂 CategoryList: đang fetch danh mục...')
    setLoading(true)
    setError(null)
    try {
      const categoriesArray = await productService.getCategories()
      
      console.log('✅ CategoryList: danh mục được fetch:', categoriesArray)
      setCategories(categoriesArray)
      
      // Auto select first category
      if (categoriesArray.length > 0 && !selectedCategoryId) {
        const firstCategory = categoriesArray[0]
        const categoryId = firstCategory.id
        const categoryName = firstCategory.categoryName || firstCategory.name || 'Danh mục'
        console.log('🔄 CategoryList: auto-select danh mục đầu tiên:', { categoryId, categoryName })
        onSelectCategory(categoryId, categoryName)
      }
    } catch (err) {
      console.error('❌ CategoryList: lỗi fetch danh mục:', err)
      setError(err instanceof Error ? err.message : 'Lỗi tải danh mục')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full md:w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p className="text-center text-gray-500">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="w-full md:w-64 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-bold text-gray-900">📂 Danh Mục</h2>
        <p className="text-xs text-gray-500 mt-1">Nhấn để xem sản phẩm</p>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {categories.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Không có danh mục
          </div>
        ) : (
          categories.map((category) => {
            const categoryId = category.id
            const categoryName = category.categoryName || category.name || 'Unnamed'
            return (
              <button
                key={categoryId}
                onClick={() => {
                  console.log('👆 CategoryList: click danh mục:', { categoryId, categoryName })
                  onSelectCategory(categoryId, categoryName)
                }}
                className={`w-full text-left px-4 py-3 transition ${
                  selectedCategoryId === categoryId
                    ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{categoryName}</span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
