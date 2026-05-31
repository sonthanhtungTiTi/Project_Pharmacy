import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBarcode, faSearch, faSpinner, faBoxOpen, faExclamationTriangle, faCheckCircle, faTimesCircle, faCamera, faStopCircle, faPen, faHistory } from '@fortawesome/free-solid-svg-icons'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import medicineservice from '../services/product.service'
import type { Product } from '../services/product.service'
import MedicineForm from '../components/products/MedicineForm'

export default function StockCheck() {
  const [scannedCode, setScannedCode] = useState<string>('')
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const [showEditForm, setShowEditForm] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<Product[]>([])

  // Khởi tạo/Dọn dẹp camera
  useEffect(() => {
    let isMounted = true

    if (isScanning) {
      setCameraError(null)
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.ITF,
      ];

      const html5QrCode = new Html5Qrcode("reader", { formatsToSupport, verbose: false })
      scannerRef.current = html5QrCode

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 350, height: 150 },
          formatsToSupport: formatsToSupport
        } as any,
        (decodedText) => {
          // Khi quét thành công
          setScannedCode(prev => {
            if (prev !== decodedText) {
              fetchProduct(decodedText)
            }
            return decodedText
          })
        },
        () => {
          // Ignore parse errors, they spam
        }
      ).catch((err) => {
        if (isMounted) {
          console.error("Lỗi khởi động camera:", err)
          setCameraError("Không thể truy cập camera. Vui lòng cấp quyền hoặc kiểm tra lại thiết bị!")
          setIsScanning(false)
        }
      })

      return () => {
        isMounted = false
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear()
          }).catch(() => {})
        }
      }
    }
  }, [isScanning])

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear()
        })
      }
    }
  }, [])

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (scannedCode.trim()) {
      fetchProduct(scannedCode.trim())
    }
  }

  const fetchProduct = async (code: string) => {
    setLoading(true)
    setError(null)
    setProduct(null)
    try {
      const data = await medicineservice.getProductById(code)
      setProduct(data)
      setScanHistory(prev => {
        const filtered = prev.filter(p => p.medicineCode !== data.medicineCode)
        return [data, ...filtered]
      })
    } catch (err: any) {
      console.error("Lỗi khi tìm sản phẩm:", err)
      setError("Không tìm thấy sản phẩm với mã này!")
    } finally {
      setLoading(false)
    }
  }

  const getStockStatusColor = (stock: number = 0) => {
    if (stock === 0) return 'border-red-500 bg-red-50 text-red-700'
    if (stock < 20) return 'border-yellow-500 bg-yellow-50 text-yellow-700'
    return 'border-green-500 bg-green-50 text-green-700'
  }

  const getStockStatusIcon = (stock: number = 0) => {
    if (stock === 0) return faTimesCircle
    if (stock < 20) return faExclamationTriangle
    return faCheckCircle
  }

  const getStockStatusText = (stock: number = 0) => {
    if (stock === 0) return 'Sản phẩm đã hết hàng!'
    if (stock < 20) return 'Sắp hết hàng!'
    return 'Tồn kho an toàn'
  }

  const isExpired = (dateString?: string) => {
    if (!dateString) return false
    return new Date(dateString) < new Date()
  }

  const getImageUrl = (prod: Product | null = product) => {
    if (!prod?.images) return '/placeholder-medicine.png'
    if (Array.isArray(prod.images)) {
      return prod.images[0] || '/placeholder-medicine.png'
    }
    return prod.images
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FontAwesomeIcon icon={faBarcode} className="text-blue-600" />
          Quét Mã Kiểm Kho
        </h1>
        <p className="text-gray-600 mt-1">Sử dụng camera hoặc nhập mã thủ công để kiểm tra tồn kho</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Khối quét & tìm kiếm */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold">Camera Quét Mã</h2>
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition cursor-pointer ${
                isScanning 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              <FontAwesomeIcon icon={isScanning ? faStopCircle : faCamera} />
              {isScanning ? 'Tắt Camera' : 'Bật Camera'}
            </button>
          </div>
          
          {/* Vùng Camera */}
          <div className="relative bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 min-h-[250px] flex items-center justify-center overflow-hidden">
            <div id="reader" className={`w-full ${!isScanning ? 'hidden' : ''}`}></div>
            {!isScanning && (
              <div className="text-gray-400 text-center p-4">
                <FontAwesomeIcon icon={faCamera} className="text-4xl mb-2 opacity-50" />
                <p>Nhấn "Bật Camera" để bắt đầu quét mã</p>
              </div>
            )}
          </div>
          
          {cameraError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
              {cameraError}
            </div>
          )}

          <div className="pt-2">
            <h2 className="text-sm font-semibold mb-2 text-gray-700">Hoặc nhập mã thủ công</h2>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập dãy số vạch (VD: 9338317000064)"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                type="submit"
                className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faSearch} />
                Tìm
              </button>
            </form>
          </div>
        </div>

        {/* Khối hiển thị kết quả */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold border-b pb-2 mb-4">Kết Quả Kiểm Tra</h2>

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 text-blue-600">
              <FontAwesomeIcon icon={faSpinner} spin className="text-4xl mb-4" />
              <p>Đang tìm kiếm thông tin...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 text-center px-4">
              <FontAwesomeIcon icon={faBoxOpen} className="text-5xl mb-4 text-gray-300" />
              <p className="font-medium text-lg mb-1">Không tìm thấy sản phẩm</p>
              <p className="text-sm text-gray-500">Mã "{scannedCode}" chưa được lưu trong hệ thống, hoặc mã này thuộc chuẩn khác.</p>
            </div>
          )}

          {!loading && !error && !product && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <FontAwesomeIcon icon={faBarcode} className="text-5xl mb-4 text-gray-200" />
              <p>Hãy quét hoặc nhập mã để kiểm tra</p>
            </div>
          )}

          {product && !loading && (
            <div className="space-y-6">
              {/* Thông Tin Cơ Bản */}
              <div 
                className="flex gap-4 p-4 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition relative group"
                onClick={() => setShowEditForm(true)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                  <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-200">
                    <FontAwesomeIcon icon={faPen} /> Sửa
                  </button>
                </div>
                <img 
                  src={getImageUrl()} 
                  alt={product.productName} 
                  className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-gray-800 leading-tight mb-1">{product.productName}</h3>
                  <p className="text-sm text-gray-500 mb-2">Mã DB: <span className="font-medium">{product.medicineCode}</span> | Hãng: {product.manufacturer || 'Không rõ'}</p>
                  <p className="text-xl font-bold text-blue-600 mb-2">
                    {Number(product.price).toLocaleString('vi-VN')} đ
                  </p>
                  
                  {/* Mã QR của hệ thống */}
                  {(product as any).qrCode && (
                    <div className="mt-3 bg-blue-50/50 p-2 rounded border border-blue-100 flex items-start gap-3">
                      <img src={(product as any).qrCode} alt={`QR Code ${product.medicineCode}`} className="w-16 h-16 rounded bg-white" />
                      <div>
                        <p className="text-xs font-semibold text-blue-800 mb-1">Mã QR Hệ thống</p>
                        <p className="text-[11px] text-gray-500 leading-tight">In mã này dán lên hộp thuốc để quét kiểm kho nhanh và chính xác 100%.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tổng Tồn Kho */}
              <div className={`p-4 rounded-xl border flex items-center gap-4 shadow-sm ${getStockStatusColor(product.totalStock)}`}>
                <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center">
                  <FontAwesomeIcon icon={getStockStatusIcon(product.totalStock)} className="text-2xl" />
                </div>
                <div>
                  <p className="font-bold text-lg">{getStockStatusText(product.totalStock)}</p>
                  <p className="text-sm opacity-90">Tổng số lượng trong kho: <span className="font-bold text-lg">{product.totalStock || 0}</span></p>
                </div>
              </div>

              {/* Chi tiết Lô Hàng */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Danh sách Lô Hàng</h4>
                {product.inventory && product.inventory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {product.inventory.map((batch, index) => {
                      const expired = isExpired(batch.expiryDate);
                      return (
                        <div 
                          key={index} 
                          className={`flex justify-between items-center p-3 rounded-lg border shadow-sm transition-all ${expired ? 'border-red-200 bg-red-50/50 hover:bg-red-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                        >
                          <div>
                            <p className="font-semibold text-gray-800">Lô: {batch.batchNumber || 'Không rõ'}</p>
                            <p className={`text-sm ${expired ? 'text-red-500' : 'text-gray-500'}`}>
                              HSD: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('vi-VN') : 'Không rõ'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">x{batch.quantity || 0}</p>
                            {expired && <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Đã hết hạn</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-center">
                    <p className="text-gray-500 text-sm">Sản phẩm chưa có lô hàng nào trong kho.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lịch sử truy vấn */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2 text-gray-800">
            <FontAwesomeIcon icon={faHistory} className="text-blue-500" /> Lịch sử tra cứu gần đây
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanHistory.map(item => (
              <div 
                key={item.medicineCode} 
                className="flex gap-4 p-3 border border-gray-200 rounded-xl hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer transition shadow-sm"
                onClick={() => {
                  setProduct(item)
                  setScannedCode(item.medicineCode || '')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <img src={getImageUrl(item)} alt={item.productName} className="w-16 h-16 rounded-lg border border-gray-200 object-cover bg-white" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="font-semibold text-sm text-gray-900 truncate" title={item.productName}>{item.productName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Mã: <span className="font-medium">{item.medicineCode}</span></p>
                  <p className="text-sm font-bold text-blue-600 mt-1">{Number(item.price).toLocaleString('vi-VN')} đ</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditForm && product && (
        <MedicineForm
          medicine={product}
          categoryId={product.categoryId || ''}
          categoryName={product.categoryName || ''}
          onSaved={(updatedProduct) => {
            // Because updatedProduct may not have qrCode generated yet, let's keep the old one or refetch
            setProduct(prev => prev ? { ...updatedProduct, qrCode: (prev as any).qrCode } as unknown as Product : updatedProduct)
            setShowEditForm(false)
            setToastMessage("Cập nhật thông tin thuốc thành công!")
            setTimeout(() => setToastMessage(null), 2500)
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {toastMessage && (
        <div className="fixed right-6 top-6 z-[60] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
