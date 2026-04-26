export interface WardV1 {
	code: string
	name: string
}

export interface DistrictV1 {
	code: string
	name: string
	wards?: WardV1[]
}

export interface ProvinceV1 {
	code: string
	name: string
	districts?: DistrictV1[]
}

export interface ProvinceData {
	[provinceName: string]: {
		[districtName: string]: string[]
	}
}
