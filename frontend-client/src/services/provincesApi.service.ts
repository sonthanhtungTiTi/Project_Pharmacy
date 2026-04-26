import type { ProvinceV1, ProvinceData } from "../types/Province";

// Fetch dữ liệu từ API v1 (phân cấp cho "Trước sáp nhập")
// depth=1: chỉ lấy tỉnh
// depth=2: tỉnh + quận/huyện
// depth=3: tỉnh + quận/huyện + xã/phường
export const fetchProvincesV1 = async (
  depth: number = 2
): Promise<ProvinceV1[]> => {
  try {
    const response = await fetch(
      `https://provinces.open-api.vn/api/v1/?depth=${depth}`
    );
    if (!response.ok) {
      throw new Error(`API v1 error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching provinces v1:", error);
    throw error;
  }
};

// Fetch một tỉnh cụ thể với depth
export const fetchProvinceV1ByCode = async (
  provinceCode: string,
  depth: number = 3
): Promise<ProvinceV1> => {
  try {
    const response = await fetch(
      `https://provinces.open-api.vn/api/v1/p/${provinceCode}?depth=${depth}`
    );
    if (!response.ok) {
      throw new Error(`API v1 province error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching province v1 by code:", error);
    throw error;
  }
};

// Transform API v1 data thành object dễ dùng (Tỉnh → Quận → Xã)
export const transformV1Data = (provinces: ProvinceV1[]): ProvinceData => {
  const result: ProvinceData = {};

  provinces.forEach((province) => {
    result[province.name] = {};
    if (province.districts) {
      province.districts.forEach((district) => {
        result[province.name][district.name] = district.wards
          ? district.wards.map((ward) => ward.name)
          : [];
      });
    }
  });

  return result;
};
