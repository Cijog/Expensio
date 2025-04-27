"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  PieChart,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Coffee,
  ShoppingBag,
  Home,
  Car,
  Film,
  Briefcase,
  Utensils,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Doughnut } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from "chart.js"

// Register Chart.js components
ChartJS.register(ArcElement, ChartTooltip, Legend)

// Category icons mapping
const categoryIcons = {
  Food: <Utensils className="h-4 w-4" />,
  Coffee: <Coffee className="h-4 w-4" />,
  Shopping: <ShoppingBag className="h-4 w-4" />,
  Transportation: <Car className="h-4 w-4" />,
  Accommodation: <Home className="h-4 w-4" />,
  Entertainment: <Film className="h-4 w-4" />,
  "Office Supplies": <Briefcase className="h-4 w-4" />,
  Other: <DollarSign className="h-4 w-4" />,
}

// Category colors mapping
const categoryColors = {
  Food: "rgba(255, 99, 132, 0.7)",
  Coffee: "rgba(255, 159, 64, 0.7)",
  Shopping: "rgba(255, 205, 86, 0.7)",
  Transportation: "rgba(75, 192, 192, 0.7)",
  Accommodation: "rgba(54, 162, 235, 0.7)",
  Entertainment: "rgba(153, 102, 255, 0.7)",
  "Office Supplies": "rgba(201, 203, 207, 0.7)",
  Other: "rgba(138, 43, 226, 0.7)",
}

// Budget thresholds by category (percentage of total budget)
const categoryBudgetThresholds = {
  Food: 0.25, // 25% of budget
  Coffee: 0.05, // 5% of budget
  Shopping: 0.15, // 15% of budget
  Transportation: 0.15, // 15% of budget
  Accommodation: 0.3, // 30% of budget
  Entertainment: 0.1, // 10% of budget
  "Office Supplies": 0.05, // 5% of budget
  Other: 0.1, // 10% of budget
}

// Saving tips by category
const savingTips = {
  Food: [
    "Cook meals at home instead of eating out",
    "Meal prep for the week to avoid impulse food purchases",
    "Use grocery store loyalty programs and coupons",
    "Buy seasonal produce to save money",
    "Consider cheaper protein alternatives like beans and lentils",
  ],
  Coffee: [
    "Make coffee at home instead of buying at cafes",
    "Invest in a quality thermos to bring coffee from home",
    "If you must buy out, join loyalty programs for free drinks",
    "Downsize your usual order (e.g., medium instead of large)",
  ],
  Shopping: [
    "Create a shopping list and stick to it",
    "Wait 24 hours before making non-essential purchases",
    "Look for second-hand or refurbished items",
    "Use cashback apps and browser extensions for online shopping",
    "Unsubscribe from retailer emails to avoid temptation",
  ],
  Transportation: [
    "Use public transportation when possible",
    "Consider carpooling with colleagues",
    "Combine errands to save on fuel",
    "Check if your employer offers commuter benefits",
    "For longer trips, compare costs of driving vs. flying",
  ],
  Accommodation: [
    "Consider alternative accommodations like Airbnb",
    "Book accommodations with kitchen facilities to save on meals",
    "Look for corporate rates or loyalty program discounts",
    "Book well in advance for better rates",
    "Stay slightly outside city centers for better rates",
  ],
  Entertainment: [
    "Look for free or low-cost events in your area",
    "Use streaming services instead of going to movies",
    "Check for happy hour specials and early bird discounts",
    "Use library services for books, movies, and more",
    "Look for tourist passes that bundle attractions",
  ],
  "Office Supplies": [
    "Buy in bulk for frequently used items",
    "Reuse and repurpose items when possible",
    "Check if your company can provide supplies",
    "Look for back-to-school sales for big discounts",
    "Consider refillable pens and other sustainable options",
  ],
  Other: [
    "Review all subscriptions and cancel unused ones",
    "Negotiate bills like internet and phone service",
    "Look for cashback on credit cards for everyday spending",
    "Set up automatic transfers to savings",
    "Use budgeting apps to track all expenses",
  ],
}

function MonthlyExpenseAnalyzer({ monthlyBudget = 2000 }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoryExpenses, setCategoryExpenses] = useState({})
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [showAllTips, setShowAllTips] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split("T")[0].substring(0, 7)) // Format: YYYY-MM

  // Get current month name and year for display
  const currentMonthName = new Date().toLocaleString("default", { month: "long" })
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchExpenses()
  }, [currentMonth])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.get("http://localhost:5000/expenses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })

      // Filter expenses for the current month
      const currentMonthExpenses = response.data.filter((expense) => {
        if (!expense || !expense.date) return false
        return expense.date.startsWith(currentMonth)
      })

      setExpenses(currentMonthExpenses)

      // Group expenses by category
      const expensesByCategory = {}
      currentMonthExpenses.forEach((expense) => {
        if (!expense.category) return

        // Normalize category name
        let category = expense.category
        if (category === "Trip Expense") {
          category = "Other" // Categorize trip expenses as "Other" for simplicity
        }

        if (!expensesByCategory[category]) {
          expensesByCategory[category] = []
        }
        expensesByCategory[category].push(expense)
      })

      // Calculate total for each category
      const categoryTotals = {}
      Object.keys(expensesByCategory).forEach((category) => {
        categoryTotals[category] = expensesByCategory[category].reduce((sum, expense) => sum + (expense.amount || 0), 0)
      })

      setCategoryExpenses(categoryTotals)
    } catch (err) {
      console.error("Error fetching expenses for analysis:", err)
      setError("Failed to load expense data for analysis.")
    } finally {
      setLoading(false)
    }
  }

  // Calculate total expenses for the month
  const totalMonthlyExpenses = Object.values(categoryExpenses).reduce((sum, amount) => sum + amount, 0)

  // Calculate budget status
  const budgetRemaining = monthlyBudget - totalMonthlyExpenses
  const budgetPercentage = (totalMonthlyExpenses / monthlyBudget) * 100

  // Prepare data for pie chart
  const chartData = {
    labels: Object.keys(categoryExpenses),
    datasets: [
      {
        data: Object.values(categoryExpenses),
        backgroundColor: Object.keys(categoryExpenses).map(
          (category) => categoryColors[category] || "rgba(138, 43, 226, 0.7)",
        ),
        borderColor: Object.keys(categoryExpenses).map(
          (category) => categoryColors[category]?.replace("0.7", "1") || "rgba(138, 43, 226, 1)",
        ),
        borderWidth: 1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "white",
          font: {
            size: 12,
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context) => {
            const value = context.raw
            const percentage = ((value / totalMonthlyExpenses) * 100).toFixed(1)
            return `€${value.toFixed(2)} (${percentage}%)`
          },
        },
      },
    },
    cutout: "60%",
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  }

  // Generate insights and recommendations
  const generateInsights = () => {
    // Find the top spending categories
    const sortedCategories = Object.entries(categoryExpenses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // Calculate which categories are over budget
    const overBudgetCategories = Object.entries(categoryExpenses)
      .filter(([category, amount]) => {
        const threshold = categoryBudgetThresholds[category] || 0.1
        return amount > monthlyBudget * threshold
      })
      .sort((a, b) => {
        // Sort by how much they exceed their threshold percentage
        const aThreshold = categoryBudgetThresholds[a[0]] || 0.1
        const bThreshold = categoryBudgetThresholds[b[0]] || 0.1

        const aExceedRatio = a[1] / (monthlyBudget * aThreshold)
        const bExceedRatio = b[1] / (monthlyBudget * bThreshold)

        return bExceedRatio - aExceedRatio
      })

    return {
      topCategories: sortedCategories,
      overBudgetCategories: overBudgetCategories,
    }
  }

  const insights = generateInsights()

  // Toggle category expansion
  const toggleCategory = (category) => {
    if (expandedCategory === category) {
      setExpandedCategory(null)
    } else {
      setExpandedCategory(category)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <PieChart className="h-6 w-6 mr-2 text-green-400" />
          <h2 className="text-xl text-white font-bold">Monthly Budget Analyzer</h2>
        </div>
        <div className="text-gray-300 text-sm font-medium">
          {currentMonthName} {currentYear}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-300">Analyzing your expenses...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="font-medium">Error Loading Data</p>
          </div>
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Budget Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Monthly Budget</p>
              <p className="text-white text-2xl font-bold">€{monthlyBudget.toFixed(2)}</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Spent So Far</p>
              <p className="text-white text-2xl font-bold">€{totalMonthlyExpenses.toFixed(2)}</p>
              <p className="text-sm mt-1">
                <span className={budgetPercentage > 100 ? "text-red-400" : "text-green-400"}>
                  {budgetPercentage.toFixed(1)}% of budget
                </span>
              </p>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">{budgetRemaining >= 0 ? "Remaining Budget" : "Over Budget"}</p>
              <p className={`text-2xl font-bold ${budgetRemaining >= 0 ? "text-green-400" : "text-red-400"}`}>
                {budgetRemaining >= 0 ? "€" + budgetRemaining.toFixed(2) : "-€" + Math.abs(budgetRemaining).toFixed(2)}
              </p>
              <p className="text-sm mt-1 text-gray-400">
                {budgetRemaining >= 0
                  ? `€${(budgetRemaining / (new Date(currentYear, Number.parseInt(currentMonth.split("-")[1]), 0).getDate() - new Date().getDate() + 1)).toFixed(2)} per day remaining`
                  : "You've exceeded your monthly budget"}
              </p>
            </div>
          </div>

          {/* Budget Status Alert */}
          {budgetPercentage > 90 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg mb-6"
            >
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Budget Alert</p>
                  <p className="mt-1">
                    {budgetPercentage >= 100
                      ? `You've exceeded your monthly budget by €${Math.abs(budgetRemaining).toFixed(2)}.`
                      : `You've used ${budgetPercentage.toFixed(1)}% of your monthly budget with €${budgetRemaining.toFixed(2)} remaining.`}{" "}
                    Check the recommendations below to help manage your spending.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Expense Breakdown Chart */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="text-white font-medium mb-4">Expense Breakdown</h3>
              {Object.keys(categoryExpenses).length > 0 ? (
                <div className="h-64">
                  <Doughnut data={chartData} options={chartOptions} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className="text-gray-400">No expense data available for this month.</p>
                </div>
              )}
            </div>

            {/* Spending Insights */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="text-white font-medium mb-4">Spending Insights</h3>

              {Object.keys(categoryExpenses).length > 0 ? (
                <div className="space-y-4">
                  {insights.topCategories.length > 0 && (
                    <div>
                      <p className="text-gray-300 mb-2">Top spending categories:</p>
                      <div className="space-y-2">
                        {insights.topCategories.map(([category, amount]) => (
                          <div key={category} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                            <div className="flex items-center">
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                                style={{ backgroundColor: categoryColors[category] || "rgba(138, 43, 226, 0.7)" }}
                              >
                                {categoryIcons[category] || <DollarSign className="h-4 w-4" />}
                              </span>
                              <span className="text-white">{category}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-white font-medium">€{amount.toFixed(2)}</span>
                              <span className="text-gray-400 text-sm ml-2">
                                ({((amount / totalMonthlyExpenses) * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.overBudgetCategories.length > 0 && (
                    <div>
                      <p className="text-gray-300 mb-2">Categories exceeding recommended budget:</p>
                      <div className="space-y-2">
                        {insights.overBudgetCategories.map(([category, amount]) => {
                          const threshold = categoryBudgetThresholds[category] || 0.1
                          const recommendedBudget = monthlyBudget * threshold
                          const overBudgetAmount = amount - recommendedBudget
                          const overBudgetPercentage = (amount / recommendedBudget) * 100 - 100

                          return (
                            <div key={category} className="bg-red-900/20 border border-red-800/30 p-2 rounded-md">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                                    style={{ backgroundColor: categoryColors[category] || "rgba(138, 43, 226, 0.7)" }}
                                  >
                                    {categoryIcons[category] || <DollarSign className="h-4 w-4" />}
                                  </span>
                                  <span className="text-white">{category}</span>
                                </div>
                                <div className="flex items-center">
                                  <TrendingUp className="h-4 w-4 text-red-400 mr-1" />
                                  <span className="text-red-400">+{overBudgetPercentage.toFixed(0)}%</span>
                                </div>
                              </div>
                              <div className="mt-1 text-sm text-gray-300">
                                <span>Spent: €{amount.toFixed(2)}</span>
                                <span className="mx-2">•</span>
                                <span>Recommended: €{recommendedBudget.toFixed(2)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {insights.overBudgetCategories.length === 0 && (
                    <div className="bg-green-900/20 border border-green-800/30 p-3 rounded-md">
                      <div className="flex items-center">
                        <TrendingDown className="h-5 w-5 text-green-400 mr-2" />
                        <span className="text-green-400 font-medium">Great job!</span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">
                        You're staying within recommended budget thresholds for all categories.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className="text-gray-400">No expense data available for this month.</p>
                </div>
              )}
            </div>
          </div>

          {/* Saving Recommendations */}
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center mb-4">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
              <h3 className="text-white font-medium">Saving Recommendations</h3>
            </div>

            {insights.overBudgetCategories.length > 0 ? (
              <div className="space-y-3">
                {insights.overBudgetCategories.slice(0, showAllTips ? undefined : 2).map(([category]) => (
                  <div key={category} className="bg-gray-800 rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 text-left"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                          style={{ backgroundColor: categoryColors[category] || "rgba(138, 43, 226, 0.7)" }}
                        >
                          {categoryIcons[category] || <DollarSign className="h-4 w-4" />}
                        </span>
                        <span className="text-white font-medium">{category} Saving Tips</span>
                      </div>
                      {expandedCategory === category ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedCategory === category && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 border-t border-gray-700">
                            <ul className="space-y-2">
                              {(savingTips[category] || savingTips.Other).map((tip, index) => (
                                <li key={index} className="flex items-start text-gray-300">
                                  <ArrowRight className="h-4 w-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {insights.overBudgetCategories.length > 2 && (
                  <button
                    className="text-purple-400 hover:text-purple-300 text-sm flex items-center mx-auto mt-2"
                    onClick={() => setShowAllTips(!showAllTips)}
                  >
                    {showAllTips ? (
                      <>
                        Show less <ChevronUp className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Show all {insights.overBudgetCategories.length} categories{" "}
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-gray-300 p-2">
                {Object.keys(categoryExpenses).length > 0 ? (
                  <p>You're doing great! Here are some general tips to save even more:</p>
                ) : (
                  <p>Start tracking your expenses to get personalized saving recommendations.</p>
                )}
                <ul className="space-y-2 mt-3">
                  <li className="flex items-start">
                    <ArrowRight className="h-4 w-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
                    <span>Set up automatic transfers to a savings account at the beginning of the month</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-4 w-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
                    <span>Review all subscriptions and cancel those you don't use regularly</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-4 w-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
                    <span>Use the 24-hour rule: wait a day before making non-essential purchases</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

export default MonthlyExpenseAnalyzer
