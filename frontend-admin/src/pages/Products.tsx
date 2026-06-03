import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircle,
  faCircleCheck,
  faCircleXmark,
  faEye,
  faMagnifyingGlass,
  faPills,
  faTrash,
  faWarehouse,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import adminProductService from '../services/admin-product.service'
import type { AdminProduct, ProductQueryParams, Pagination } from '../services/admin-product.service'

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'name'>('newest')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [currentPage, statusFilter, sortBy])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: ProductQueryParams = {
        page: currentPage,
        limit: 15,
        status: statusFilter,
        sortBy,
      }
      if (search.trim()) params.search = search.trim()

      const data = await adminProductService.getProducts(params)
      setProducts(data.items)
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadProducts()
  }

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`Bạn có chắc muốn vô hiệu hóa sản phẩm "${product.productName}"?`)) return
    setActionLoading(true)
    try {
      await adminProductService.deleteProduct(product.id)
      loadProducts()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FontAwesomeIcon icon={faPills} className="text-blue-600" />
            {/* Quản Lý Sản Phẩm */}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý danh sách thuốc và sản phẩm trong hệ thống</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Tìm theo tên, mã thuốc, thương hiệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[250px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">Tất cả</option>
            <option value="active">Đang bán</option>
            <option value="inactive">Ngừng bán</option>
          </select>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="newest">Mới nhất</option>
            <option value="name">Tên A-Z</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" />
            Tìm
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{error}</div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2"><FontAwesomeIcon icon={faPills} /></p>
            <p>Không tìm thấy sản phẩm nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">SẢN PHẨM</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">MÃ</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs">DANH MỤC</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs">GIÁ</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-xs">TỒN KHO</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-xs">TRẠNG THÁI</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-xs">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 text-sm truncate max-w-[250px]">{product.productName}</p>
                      <p className="text-xs text-gray-400">{product.brand || product.manufacturer || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{product.medicineCode}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">{product.categoryName}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900 text-sm">{formatCurrency(product.price)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${product.totalStock === 0 ? 'bg-red-100 text-red-700' :
                        product.totalStock <= 10 ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {product.totalStock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.isActive ? 'Đang bán' : 'Ngừng'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setSelectedProduct(product); setShowDetail(true) }}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          title="Xem chi tiết"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        {product.isActive && (
                          <button
                            onClick={() => handleDelete(product)}
                            disabled={actionLoading}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                            title="Ngừng bán"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Trang {pagination.page} / {pagination.totalPages} ({pagination.total} sản phẩm)
            </p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50">←</button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-xs border rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-white'}`}>
                  {page}
                </button>
              ))}
              <button onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))} disabled={currentPage === pagination.totalPages}
                className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {showDetail && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Chi Tiết Sản Phẩm</h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Tên:</span> <span className="font-medium">{selectedProduct.productName}</span></div>
                <div><span className="text-gray-500">Mã:</span> <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{selectedProduct.medicineCode}</span></div>
                <div><span className="text-gray-500">Giá:</span> <span className="font-bold text-green-600">{formatCurrency(selectedProduct.price)}</span></div>
                <div><span className="text-gray-500">Tồn kho:</span> <span className="font-bold">{selectedProduct.totalStock}</span></div>
                <div><span className="text-gray-500">Danh mục:</span> {selectedProduct.categoryName}</div>
                <div><span className="text-gray-500">Thương hiệu:</span> {selectedProduct.brand || '—'}</div>
                <div><span className="text-gray-500">Nhà SX:</span> {selectedProduct.manufacturer || '—'}</div>
                <div><span className="text-gray-500">Đơn vị:</span> {selectedProduct.unit || '—'}</div>
                <div>
                  <span className="text-gray-500">Kê đơn:</span>{' '}
                  {selectedProduct.requiresPrescription ? (
                    <span className="text-green-600 font-medium">
                      <FontAwesomeIcon icon={faCircleCheck} className="mr-1" /> Có
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      <FontAwesomeIcon icon={faCircleXmark} className="mr-1" /> Không
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Trạng thái:</span>{' '}
                  {selectedProduct.isActive ? (
                    <span className="text-green-600 font-medium">
                      <FontAwesomeIcon icon={faCircle} className="mr-1" /> Đang bán
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      <FontAwesomeIcon icon={faCircle} className="mr-1" /> Ngừng
                    </span>
                  )}
                </div>
              </div>

              {selectedProduct.usageSummary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Cách dùng:</p>
                  <p className="text-sm text-gray-700">{selectedProduct.usageSummary}</p>
                </div>
              )}

              {selectedProduct.dosage && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Liều dùng:</p>
                  <p className="text-sm text-gray-700">{selectedProduct.dosage}</p>
                </div>
              )}

              {/* Inventory Batches */}
              {selectedProduct.inventory.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faWarehouse} className="text-blue-600" />
                    Lô hàng ({selectedProduct.inventory.length})
                  </p>
                  <div className="space-y-2">
                    {selectedProduct.inventory.map((batch, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <span className="font-mono font-medium">{batch.batchNumber}</span>
                          <span className="text-gray-500 ml-2">SL: {batch.quantity}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">HSD: {new Date(batch.expiryDate).toLocaleDateString('vi-VN')}</p>
                          <p className="text-xs text-gray-400">Giá nhập: {formatCurrency(batch.importPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
