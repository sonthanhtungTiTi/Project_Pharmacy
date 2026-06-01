import { useEffect, useState } from 'react'
import * as faceapi from '@vladmandic/face-api'

export const useFaceDetection = () => {
	const [modelsLoaded, setModelsLoaded] = useState(false)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		let isMounted = true

		const loadModels = async () => {
			try {
				setLoading(true)
				console.log('[FaceDetection] Preloading face-api models...')
				
				await Promise.all([
					faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
					faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
					faceapi.nets.faceRecognitionNet.loadFromUri('/models')
				])

				if (isMounted) {
					setModelsLoaded(true)
					setLoading(false)
					console.log('[FaceDetection] Preloaded all models successfully!')
				}
			} catch (err: any) {
				console.error('[FaceDetection] Failed to preload models:', err)
				if (isMounted) {
					setError(err instanceof Error ? err : new Error(String(err)))
					setLoading(false)
				}
			}
		}

		void loadModels()

		return () => {
			isMounted = false
		}
	}, [])

	return { modelsLoaded, loading, error }
}
