"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Pie, Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js"
import { Filter, Download } from "lucide-react"

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement)

function Expenses({ user }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearlyTotal, setYearlyTotal] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [categories, setCategories] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await axios.get("http://localhost:5000/expenses")
        setExpenses(response.data)

        // Extract unique categories
        const uniqueCategories = [...new Set(response.data.map((expense) => expense.category || "Uncategorized"))]
        setCategories(uniqueCategories)
      } catch (err) {
        console.error("Fetch expenses error:", err)
        setError(err.response?.data?.error || "Failed to fetch expenses. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [])

  // Group expenses by category
  const groupByCategory = (expenses) => {
    const grouped = {}
    expenses.forEach((expense) => {
      const category = expense.category || "Uncategorized"
      if (!grouped[category]) grouped[category] = 0
      grouped[category] += expense.amount || 0
    })
    return grouped
  }

  // Group expenses by month for trends
  const groupByMonth = (expenses) => {
    const grouped = {}
    expenses.forEach((expense) => {
      const month = new Date(expense.date).toLocaleString("default", { month: "short" })
      if (!grouped[month]) grouped[month] = 0
      grouped[month] += expense.amount || 0
    })
    return grouped
  }

  // Group expenses by month and year
  const groupByMonthYear = (expenses) => {
    const grouped = {}
    expenses.forEach((expense) => {
      const monthYear = new Date(expense.date).toLocaleString("default", { month: "long", year: "numeric" })
      if (!grouped[monthYear]) grouped[monthYear] = { expenses: [], total: 0 }
      grouped[monthYear].expenses.push(expense)
      grouped[monthYear].total += expense.amount || 0
    })
    return grouped
  }

  // Calculate yearly total for selected year
  const calculateYearlyTotal = (expenses, year) => {
    return expenses
      .filter((expense) => new Date(expense.date).getFullYear() === year)
      .reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }

  // Filter expenses by year and category
  const filterExpenses = () => {
    let filtered = expenses.filter((expense) => new Date(expense.date).getFullYear() === selectedYear)

    if (selectedCategory !== "All") {
      filtered = filtered.filter((expense) => expense.category === selectedCategory)
    }

    return filtered
  }

  const filteredExpenses = filterExpenses()
  const groupedExpensesByCategory = groupByCategory(filteredExpenses)
  const groupedExpensesByMonth = groupByMonth(filteredExpenses)
  const groupedExpensesByMonthYear = groupByMonthYear(filteredExpenses)

  const years = [...new Set(expenses.map((expense) => new Date(expense.date).getFullYear()).sort((a, b) => b - a))]

  useEffect(() => {
    setYearlyTotal(calculateYearlyTotal(expenses, selectedYear))
  }, [expenses, selectedYear])

  const handleExportCSV = () => {
    // Create CSV content
    let csvContent = "Category,Description,Amount,Date\n"

    filteredExpenses.forEach((expense) => {
      const row = [
        expense.category || "Uncategorized",
        expense.description || "",
        expense.amount.toFixed(2),
        new Date(expense.date).toLocaleDateString(),
      ]
        .map((value) => `"${value}"`)
        .join(",")

      csvContent += row + "\n"
    })

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `expenses_${selectedYear}_${selectedCategory}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="p-6 text-white">Loading expenses...</div>
  if (error) return <div className="p-6 text-red-500">{error}</div>

  // Prepare data for the Pie Chart (Category Breakdown)
  const pieChartData = {
    labels: Object.keys(groupedExpensesByCategory),
    datasets: [
      {
        data: Object.values(groupedExpensesByCategory),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#E7E9ED"],
        hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#E7E9ED"],
      },
    ],
  }

  // Prepare data for the Line Chart (Expense Trends)
  const lineChartData = {
    labels: Object.keys(groupedExpensesByMonth),
    datasets: [
      {
        label: "Monthly Expenses (€)",
        data: Object.values(groupedExpensesByMonth),
        fill: false,
        borderColor: "#36A2EB",
        tension: 0.1,
      },
    ],
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-white">Expenses for {user?.username || "User"}</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-blue-accent text-white p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Filter className="h-5 w-5 mr-2" /> Filters
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download className="h-5 w-5 mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-content-bg p-4 rounded-lg mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-white mr-2 block mb-1">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                className="p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              >
                {years.length > 0 ? (
                  years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))
                ) : (
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-white mr-2 block mb-1">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-white">
              {selectedCategory === "All"
                ? `Total Spent in ${selectedYear}: €${yearlyTotal.toFixed(2)}`
                : `Total Spent on ${selectedCategory} in ${selectedYear}: €${Object.values(groupedExpensesByCategory)
                    .reduce((sum, amount) => sum + amount, 0)
                    .toFixed(2)}`}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart for Category Breakdown */}
        <div className="bg-content-bg p-6 rounded-lg">
          <h2 className="text-xl text-white mb-4">Category Breakdown</h2>
          {Object.keys(groupedExpensesByCategory).length > 0 ? (
            <Pie data={pieChartData} />
          ) : (
            <p className="text-gray-400">No data available for the selected filters.</p>
          )}
        </div>

        {/* Line Chart for Expense Trends */}
        <div className="bg-content-bg p-6 rounded-lg">
          <h2 className="text-xl text-white mb-4">Expense Trends</h2>
          {Object.keys(groupedExpensesByMonth).length > 0 ? (
            <Line data={lineChartData} />
          ) : (
            <p className="text-gray-400">No data available for the selected filters.</p>
          )}
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-content-bg p-6 rounded-lg space-y-6">
        {filteredExpenses.length === 0 ? (
          <p className="text-white">No expenses available for the selected filters.</p>
        ) : (
          Object.keys(groupedExpensesByMonthYear).map((monthYear) => (
            <div key={monthYear} className="mb-6">
              <h2 className="text-xl text-white mb-4">
                {monthYear} - Total: €{groupedExpensesByMonthYear[monthYear].total.toFixed(2)}
              </h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-600">
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedExpensesByMonthYear[monthYear].expenses.map((expense, index) => (
                    <tr
                      key={expense._id || index}
                      className="border-b border-gray-700 hover:bg-gray-800 transition-colors"
                    >
                      <td className="py-3 pr-4">{expense.category || "N/A"}</td>
                      <td className="py-3 pr-4">{expense.description || "N/A"}</td>
                      <td className="py-3 pr-4 text-right">€{(expense.amount || 0).toFixed(2)}</td>
                      <td className="py-3 pr-4">{new Date(expense.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Expenses
