import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

// Supabase 환경변수
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SearchNamePage() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [minAmount, setMinAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([]);

  const handleSearch = async () => {
    setLoading(true);
    setMessage("");
    setRows([]);

    try {
      let query = supabase
        .from("customer_sales")
        .select(
          `id, customer_flg, sale_date, customer_name, customer_phone1, customer_amount, customer_item, customer_phone2, customer_address`
        )
        .order("sale_date", { ascending: true });

      if (customerName.trim() !== "") {
        query = query.ilike("customer_name", `%${customerName.trim()}%`);
      }

      if (customerPhone.trim() !== "") {
        query = query.ilike("customer_phone1", `%${customerPhone.trim()}%`);
      }

      if (minAmount !== "" && !isNaN(Number(minAmount))) {
        query = query.gte("customer_amount", Number(minAmount));
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setMessage("조회 결과가 없습니다.");
      }

      const gridRows = data.map((item, index) => ({
        id: item.id ?? index,
        순번: index + 1,
        구분: item.customer_flg,
        매출일자: dayjs(item.sale_date).format("YYYY-MM-DD"),
        성명: item.customer_name,
        전화번호: item.customer_phone1,
        금액: item.customer_amount,
        상품명: item.customer_item,
        전화번호2: item.customer_phone2,
        주소: item.customer_address,
      }));

      setRows(gridRows);
    } catch (err) {
      console.error(err);
      setMessage("❌ 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">성명/전화번호조회</h1>

      <div className="flex flex-wrap gap-6 mb-6 items-end">
        <div>
          <label className="block font-semibold mb-1">성명 (부분검색 가능)</label>
          <input
            type="text"
            placeholder="성명 입력 (빈칸 시 전체)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">전화번호 (부분검색 가능)</label>
          <input
            type="text"
            placeholder="전화번호 입력 (빈칸 시 전체)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">최소 금액 (customer_amount ≥)</label>
          <input
            type="number"
            min="0"
            placeholder="금액 입력 (빈칸 시 전체)"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className={`bg-green-600 text-white font-bold px-6 py-3 rounded shadow hover:bg-green-700 transition ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "조회 중..." : "조회"}
          </button>
        </div>
      </div>

      {message && <p className="mb-4 text-red-600 font-semibold">{message}</p>}

      {/* ✅ 일반 테이블로 수정된 결과 표시 */}
      <div className="overflow-auto">
        <table className="w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">순번</th>
              <th className="border px-2 py-1">구분</th>
              <th className="border px-2 py-1">매출일자</th>
              <th className="border px-2 py-1">성명</th>
              <th className="border px-2 py-1">전화번호</th>
              <th className="border px-2 py-1">금액</th>
              <th className="border px-2 py-1">상품명</th>
              <th className="border px-2 py-1">전화번호2</th>
              <th className="border px-2 py-1">주소</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id} className="text-center">
                  <td className="border px-2 py-1">{row.순번}</td>
                  <td className="border px-2 py-1">{row.구분}</td>
                  <td className="border px-2 py-1">{row.매출일자}</td>
                  <td className="border px-2 py-1">{row.성명}</td>
                  <td className="border px-2 py-1">{row.전화번호}</td>
                  <td className="border px-2 py-1">{row.금액.toLocaleString()}</td>
                  <td className="border px-2 py-1">{row.상품명}</td>
                  <td className="border px-2 py-1">{row.전화번호2}</td>
                  <td className="border px-2 py-1 text-left">{row.주소}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="border px-2 py-4 text-center text-gray-500">
                  {loading ? "불러오는 중..." : "데이터가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}