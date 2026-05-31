import React, { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Webcam from 'react-webcam'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import { searchProductsByImage, type ProductItem } from '../../services/product.service'

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSearchResults: (results: ProductItem[]) => void
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ isOpen, onClose, onSearchResults }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload')
  const [imageFile, setImageFile] = useState<File | Blob | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ProductItem[]>([])
  const webcamRef = useRef<Webcam>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
    },
    maxFiles: 1,
  })

  const captureCamera = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      // Convert base64 to Blob
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          setImageFile(blob)
          setImagePreview(imageSrc)
          setError(null)
        })
    }
  }, [webcamRef])

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setError(null)
    setHasSearched(false)
    setResults([])
  }

  const handleSearch = async () => {
    if (!imageFile) return

    setIsSearching(true)
    setError(null)
    setHasSearched(false)

    try {
      const response = await searchProductsByImage(imageFile)
      setResults(response.items || [])
      setHasSearched(true)
      onSearchResults(response.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tìm kiếm bằng hình ảnh thất bại.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClose = () => {
    clearImage()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">Tìm kiếm bằng hình ảnh</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          {!imagePreview ? (
            <>
              {/* Tabs */}
              <div className="mb-6 flex space-x-1 rounded-xl bg-gray-100 p-1">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex flex-1 items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'upload'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <CloudUploadIcon className="mr-2" fontSize="small" />
                  Tải ảnh lên
                </button>
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`flex flex-1 items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'camera'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <PhotoCameraIcon className="mr-2" fontSize="small" />
                  Chụp ảnh
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'upload' ? (
                <div
                  {...getRootProps()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-gray-50 py-16 transition-colors ${isDragActive ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-100'
                    }`}
                >
                  <input {...getInputProps()} />
                  <div className="rounded-full bg-green-100 p-4 text-green-600 mb-4">
                    <CloudUploadIcon fontSize="large" />
                  </div>
                  <p className="mb-1 text-lg font-semibold text-gray-700">
                    Kéo thả ảnh hoặc click để chọn
                  </p>
                  <p className="text-sm text-gray-500">Hỗ trợ JPG, PNG (Tối đa 5MB)</p>
                </div>
              ) : (
                <div className="flex flex-col items-center overflow-hidden rounded-xl bg-gray-900">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "environment" }}
                    className="w-full max-w-lg object-cover"
                  />
                  <div className="p-4 w-full flex justify-center bg-gray-900">
                    <button
                      onClick={captureCamera}
                      className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-gray-900 hover:bg-gray-200"
                    >
                      <PhotoCameraIcon /> Chụp ngay
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Preview Image */
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-2">
                <img src={imagePreview} alt="Preview" className="h-64 w-full rounded-lg object-contain" />
                <button
                  onClick={clearImage}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow-sm backdrop-blur-sm hover:bg-red-50 hover:text-red-600"
                >
                  <DeleteIcon fontSize="small" />
                </button>
              </div>

              <div className="mt-8 flex w-full justify-center gap-4">
                <button
                  onClick={clearImage}
                  disabled={isSearching}
                  className="rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Chọn ảnh khác
                </button>
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-8 py-3 font-semibold text-white shadow-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Đang tìm kiếm...
                    </>
                  ) : (
                    <>
                      <SearchIcon /> Tìm kiếm
                    </>
                  )}
                </button>
              </div>

              {/* Empty State */}
              {hasSearched && results.length === 0 && (
                <div className="mt-8 w-full border-t border-gray-200 pt-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                    <SearchIcon fontSize="large" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-800">Không tìm thấy sản phẩm phù hợp</h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto">
                    Hình ảnh đơn thuốc chưa rõ hoặc sản phẩm hiện không có sẵn. Quý khách vui lòng thử lại với ảnh rõ nét hơn hoặc liên hệ dược sĩ để được hỗ trợ.
                  </p>
                </div>
              )}

              {/* Search Results */}
              {results.length > 0 && (
                <div className="mt-8 w-full border-t border-gray-200 pt-6">
                  <h3 className="mb-4 text-lg font-bold text-gray-800">Kết quả tìm kiếm ({results.length})</h3>
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                    {results.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition bg-white">
                        <img
                          src={typeof item.images === 'string' ? item.images.split(';')[0].trim() : (item.images[0] || 'https://via.placeholder.com/80')}
                          alt={item.productName}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 line-clamp-1">{item.productName}</h4>
                          <p className="font-medium text-green-600 mt-1">{item.price}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          {item.requiresPrescription && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 whitespace-nowrap mb-2">
                              ⚠️ Kê đơn
                            </span>
                          )}
                          <button
                            onClick={() => {
                              window.location.href = `/product/${item.id}`
                            }}
                            className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageUploadModal
