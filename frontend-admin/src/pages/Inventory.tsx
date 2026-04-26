import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faWarehouse } from '@fortawesome/free-solid-svg-icons'
import CategoryList from '../components/products/CategoryList'
import MedicineList from '../components/products/MedicineList'

export default function Inventory() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Chọn danh mục')

  const handleSelectCategory = (categoryId: string, categoryName: string) => {
    console.log('📦 Inventory: handleSelectCategory được gọi:', { categoryId, categoryName })
    setSelectedCategoryId(categoryId)
    setSelectedCategoryName(categoryName)
  }

  return (
    <div className="space-y-6 -mx-2 lg:-mx-4">
      {/* Header */}
      <div className="px-2 lg:px-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FontAwesomeIcon icon={faWarehouse} className="text-blue-600" />
          Quản Lý Kho Hàng
        </h1>
        <p className="text-gray-600 mt-1">Quản lý danh mục sản phẩm và thuốc</p>
      </div>

      {/* Layout: Categories + Medicines */}
      <div className="grid grid-cols-1 gap-4 px-2 lg:px-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar - Categories */}
        <div>
          <CategoryList
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
          />
        </div>

        {/* Main Content - Medicines */}
        <div className="min-w-0">
          {selectedCategoryId ? (
            <MedicineList categoryId={selectedCategoryId} categoryName={selectedCategoryName} />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                Chọn một danh mục từ bên trái
              </p>
              <p className="text-gray-400 text-sm">để bắt đầu quản lý sản phẩm</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
