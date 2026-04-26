const Product = require('../models/product.model')

/**
 * Convert requested quantity to base unit quantity
 */
function convertToBase(product, unit, quantity) {
	if (unit === product.baseUnit) {
		return quantity
	}
	
	const rate = product.units.get(unit)
	if (!rate) {
		throw new Error(`Đơn vị '${unit}' không được hỗ trợ cho sản phẩm này`)
	}
	
	return rate * quantity
}

/**
 * Service: Deduct inventory for a sale using FEFO (First Expired, First Out)
 * Includes race-condition prevention using Optimistic Concurrency Control.
 */
async function sellProduct(productId, unit, quantity, maxRetries = 3) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const product = await Product.findById(productId)
		if (!product) {
			throw new Error('Sản phẩm không tồn tại')
		}

		// 1. Convert to base quantity
		const neededBaseQuantity = convertToBase(product, unit, quantity)

		// 2. Validate total stock
		if (product.totalBaseQuantity < neededBaseQuantity) {
			throw new Error(`Không đủ hàng trong kho. Yêu cầu: ${neededBaseQuantity}, Hiện có: ${product.totalBaseQuantity}`)
		}

		// 3. Apply FEFO logic to deduct from specific batches
		// Note: product.inventory is already sorted by expiryDate in pre('save') 
		// but we sort again just to be 100% certain it's FEFO
		const inventory = [...product.inventory].sort(
			(a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
		)

		let remainingNeeded = neededBaseQuantity
		const updatedInventory = []
		const deductedBatches = []

		for (const batch of inventory) {
			if (remainingNeeded <= 0) {
				updatedInventory.push(batch) // Keep batch untouched
				continue
			}

			if (batch.baseQuantity <= remainingNeeded) {
				// Take all from this batch
				remainingNeeded -= batch.baseQuantity
				deductedBatches.push({
					batchNumber: batch.batchNumber,
					deductedQuantity: batch.baseQuantity
				})
				// Batch is empty, so we don't push it to updatedInventory (or push with 0 if you want to keep history)
				// usually we remove empty batches to save space:
				if (batch.baseQuantity === remainingNeeded) {
					// edge case: exactly zero
				}
			} else {
				// Take partial from this batch
				batch.baseQuantity -= remainingNeeded
				deductedBatches.push({
					batchNumber: batch.batchNumber,
					deductedQuantity: remainingNeeded
				})
				updatedInventory.push(batch)
				remainingNeeded = 0
			}
		}

		if (remainingNeeded > 0) {
			throw new Error('Lỗi logic: Tổng tồn kho đủ nhưng mảng inventory không đủ hàng')
		}

		// 4. Atomic Update with OCC (Optimistic Concurrency Control) & totalBaseQuantity check
		const result = await Product.updateOne(
			{
				_id: productId,
				totalBaseQuantity: { $gte: neededBaseQuantity }, // Condition 1: stock didn't drop below needed
				__v: product.__v // Condition 2: version matches (no parallel updates)
			},
			{
				$set: { inventory: updatedInventory },
				$inc: { 
					totalBaseQuantity: -neededBaseQuantity,
					__v: 1 // Increment version
				}
			}
		)

		// 5. Check if update was successful
		if (result.modifiedCount === 1) {
			return {
				success: true,
				productId,
				deductedBaseQuantity: neededBaseQuantity,
				deductedBatches
			}
		}

		// If modifiedCount === 0, it means someone else updated the product at the same time
		// Loop will continue and retry the transaction
	}

	throw new Error('Hệ thống bận, vui lòng thử lại sau (Race condition detected)')
}

module.exports = {
	sellProduct,
	convertToBase
}
