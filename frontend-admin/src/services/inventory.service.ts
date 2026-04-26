import productService, { type Product, type ProductsResponse } from './product.service'

/**
 * Tải danh sách danh mục với auto-select danh mục đầu tiên
 * @returns Object { categories, selectedCategoryId, selectedCategoryName }
 */
const loadCategoriesWithDefault = async () => {
  try {
    const categories = await productService.getCategories()

    if (!categories || categories.length === 0) {
      return {
        categories: [],
        selectedCategoryId: null,
        selectedCategoryName: 'Chọn danh mục',
      }
    }

    // Auto select danh mục đầu tiên
    const firstCategory = (categories[0] as any)
    const categoryId = firstCategory._id || firstCategory.id
    const categoryName = firstCategory.categoryName || firstCategory.name

    return {
      categories,
      selectedCategoryId: categoryId,
      selectedCategoryName: categoryName,
    }
  } catch (error) {
    throw new Error(`Lỗi khi tải danh mục: ${error}`)
  }
}

/**
 * Lấy danh sách sản phẩm theo danh mục
 * @param categoryId - ID của danh mục
 * @param page - Trang hiện tại
 * @param limit - Số lượng sản phẩm trên mỗi trang
 * @param search - Từ khóa tìm kiếm
 * @returns Danh sách sản phẩm của danh mục
 */
const getProductsByCategory = async (
  categoryId: string,
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<ProductsResponse> => {
  try {
    const response = await productService.getProducts(page, limit, {
      category: categoryId,
      search: search,
    })
    return response
  } catch (error) {
    throw new Error(`Lỗi khi lấy sản phẩm từ danh mục: ${error}`)
  }
}

/**
 * Tạo sản phẩm mới
 * @param productData - Dữ liệu sản phẩm
 * @returns Sản phẩm vừa tạo
 */
const createProduct = async (productData: any): Promise<Product> => {
  try {
    return await productService.createProduct(productData)
  } catch (error) {
    throw new Error(`Lỗi khi tạo sản phẩm: ${error}`)
  }
}

/**
 * Cập nhật sản phẩm
 * @param productId - ID sản phẩm
 * @param productData - Dữ liệu cập nhật
 * @returns Sản phẩm sau cập nhật
 */
const updateProduct = async (productId: string, productData: any): Promise<Product> => {
  try {
    return await productService.updateProduct(productId, productData)
  } catch (error) {
    throw new Error(`Lỗi khi cập nhật sản phẩm: ${error}`)
  }
}

/**
 * Xóa sản phẩm
 * @param productId - ID sản phẩm
 */
const deleteProduct = async (productId: string): Promise<void> => {
  try {
    return await productService.deleteProduct(productId)
  } catch (error) {
    throw new Error(`Lỗi khi xóa sản phẩm: ${error}`)
  }
}

/**
 * Xóa nhiều sản phẩm
 * @param productIds - Mảng ID sản phẩm
 */
const bulkDeleteProducts = async (productIds: string[]): Promise<void> => {
  try {
    return await productService.bulkDeleteProducts(productIds)
  } catch (error) {
    throw new Error(`Lỗi khi xóa sản phẩm: ${error}`)
  }
}

const inventoryService = {
  loadCategoriesWithDefault,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
}

export default inventoryService
