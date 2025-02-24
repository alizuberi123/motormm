"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { TasksTable } from "@/components/tasks-table"
import { TaskStats } from "@/components/task-stats"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { WorkOrderForm } from "@/components/work-order-form"
// --- IMPORTANT: import your new "DetailedRepairOrder" and modal
import { TaskDetailsModal, DetailedRepairOrder } from "@/components/task-details-modal"

import { useTasks } from "@/contexts/tasks-context"
import type { Task } from "@/types/task"
import { supabase } from "@/lib/supabase"

export default function TasksPage() {
  const router = useRouter()

  const [isWorkOrderFormOpen, setIsWorkOrderFormOpen] = useState(false)
  // We'll store the *full* DB record in selectedTask, matching DetailedRepairOrder
  const [selectedTask, setSelectedTask] = useState<DetailedRepairOrder | null>(null)

  // This is your simpler "Task" interface used for listing (with minimal fields).
  // We get them from your tasks-context
  const { tasks, setTasks } = useTasks()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    // Fetch shop_id for user
    const { data: userData, error: userErr } = await supabase
      .from("users")
      .select("shop_id")
      .eq("id", user.id)
      .single()

    if (userErr || !userData?.shop_id) {
      console.error("No shop_id found or error fetching user data:", userErr)
      return
    }

    // Load minimal tasks for listing
    await fetchTasks(userData.shop_id)
  }

  /**
   * fetchTasks loads an array of minimal "Task" objects
   * for the table & TaskStats. 
   */
  async function fetchTasks(shopId: string) {
    try {
      const { data, error } = await supabase
        .from("repair_orders")
        .select(`
          id,
          status,
          created_at,
          repair_order_details(
            description,
            notes,
            task_priority,
            mechanic_id,
            shop_staff(
              staff_name
            )
          ),
          customers(
            customer_vehicles(
              year,
              make,
              model,
              engine_type,
              vin
            )
          )
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching tasks:", error)
        setTasks([])
        return
      }
      if (!data) {
        setTasks([])
        return
      }

      // Convert DB rows => minimal "Task" objects for listing
      const transformed: Task[] = data.map((row: any) => {
        const detail = row.repair_order_details?.[0] || {}
        const staff = detail.shop_staff?.staff_name || "Unassigned"

        const vehicleObj = row.customers?.customer_vehicles?.[0] || {}
        const vehicleStr =
          vehicleObj.year || vehicleObj.make || vehicleObj.model
            ? `${vehicleObj.year ?? ""} ${vehicleObj.make ?? ""} ${vehicleObj.model ?? ""}`.trim()
            : "Unknown Vehicle"

        const timeStr = new Date(row.created_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })

        // We'll keep the DB status as-is: "Pending", "In Progress", or "Completed"
        return {
          id: row.id,
          title: detail.description || "Untitled",
          assignedTo: staff,
          time: timeStr,
          status: row.status || "Pending",
          difficulty: detail.task_priority || "",
          vehicle: vehicleStr,
          comments: detail.notes || "",
        }
      })

      setTasks(transformed)
    } catch (err) {
      console.error("Unexpected error fetching tasks:", err)
      setTasks([])
    }
  }

  /**
   * Handle "ADD NEW TASK" button (the simpler flow).
   * Usually, you'd do an insert into Supabase here or
   * rely on your WorkOrderForm to do so.
   */
  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask])
    setIsWorkOrderFormOpen(false)
  }

  /**
   * When user clicks a row in the table, 
   * we fetch the full record from the DB and open TaskDetailsModal 
   * with "DetailedRepairOrder".
   */
  async function handleTaskClick(minimalTask: Task) {
    try {
      const { data, error } = await supabase
        .from("repair_orders")
        .select(`
          *,
          repair_order_details(*, shop_staff(*)),
          customers(*, customer_vehicles(*))
        `)
        .eq("id", minimalTask.id)
        .single()

      if (error) {
        console.error("Error fetching full repair_order:", error)
        return
      }
      if (!data) {
        console.log("No data found for repair_order id:", minimalTask.id)
        return
      }

      // The "TaskDetailsModal" expects a "DetailedRepairOrder"
      // We'll pass the Supabase row directly (it matches your interface).
      setSelectedTask(data)
    } catch (err) {
      console.error("Error in handleTaskClick:", err)
    }
  }

  /**
   * Close the modal
   */
  const handleCloseModal = () => {
    setSelectedTask(null)
  }

  /**
   * When user hits "Save Changes" in TaskDetailsModal,
   * we do the DB updates, then re-fetch tasks, or manually update them.
   */
  async function handleSaveTask(updated: DetailedRepairOrder) {
    try {
      // 1) Update main status in repair_orders
      const { error: mainErr } = await supabase
        .from("repair_orders")
        .update({ status: updated.status })
        .eq("id", updated.id)
      if (mainErr) throw mainErr

      // 2) Update first detail record if any
      const detail = updated.repair_order_details?.[0]
      if (detail?.id) {
        const { error: detailErr } = await supabase
          .from("repair_order_details")
          .update({
            labour: detail.labour,
            parts: detail.parts,
            notes: detail.notes,
            cost: detail.cost,
            mileage: detail.mileage,
            task_priority: detail.task_priority,
            description: detail.description,
          })
          .eq("id", detail.id)
        if (detailErr) throw detailErr
      }

      // 3) Update customer name if changed
      if (updated.customers?.id) {
        const { error: custErr } = await supabase
          .from("customers")
          .update({
            customer_name: updated.customers.customer_name,
          })
          .eq("id", updated.customers.id)
        if (custErr) throw custErr
      }

      // 4) Update the first vehicle if changed
      const veh = updated.customers?.customer_vehicles?.[0]
      if (veh?.id) {
        const { error: vehErr } = await supabase
          .from("customer_vehicles")
          .update({
            year: veh.year,
            make: veh.make,
            model: veh.model,
            engine_type: veh.engine_type,
            vin: veh.vin,
          })
          .eq("id", veh.id)
        if (vehErr) throw vehErr
      }

      // Re-fetch the minimal tasks so the table & stats are updated
      // Or you could do a local patch if you prefer.
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        // re-fetch tasks for the correct shop
        const { data: userData } = await supabase
          .from("users")
          .select("shop_id")
          .eq("id", user.id)
          .single()
        if (userData?.shop_id) {
          await fetchTasks(userData.shop_id)
        }
      }

      // Close the modal
      setSelectedTask(null)
    } catch (err) {
      console.error("Error saving task details:", err)
    }
  }

  /**
   * If the WorkOrderForm returns data, you can refresh or push it into tasks
   */
  const handleSaveWorkOrder = (data: any) => {
    console.log("handleSaveWorkOrder => got data from form:", data)
    // Possibly trigger a re-fetch or do an insert.
  }

  return (
    <div className="min-h-screen bg-[#151515] flex flex-col">
      {/* Top bar */}
      <div className="p-4 bg-[#131313]">
        <div className="flex items-center px-6 py-3 bg-[#1a1a1a] rounded-[32px]">
          <div className="flex items-center gap-2 font-semibold text-white">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MOTORMINDS-xT1F9wcHLYqhjkFz1dJwcACLAPUey3.png"
              alt="Motorminds Logo"
              className="h-8 w-8"
            />
            <span>Motorminds</span>
          </div>
          <MainNav />
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-[#2d2d2d] transition-colors duration-200"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>MM</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-6 min-h-0">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-2">
            <div className="w-1 h-8 bg-[#b22222]" />
            Tasks
          </h1>
        </div>

        {/* Stats: uses tasks from context */}
        <TaskStats />

        {/* Table + "Add New Task" button */}
        <div className="mt-8 bg-[#1A1A1A] rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Task List</h2>
            <Button
              className="bg-[#b22222] hover:bg-[#e23232] text-white transition-colors duration-200"
              onClick={() => setIsWorkOrderFormOpen(true)}
            >
              <Plus className="mr-2 h-5 w-5" /> ADD NEW TASK
            </Button>
          </div>

          {/* We pass tasks={tasks} so the table shows them */}
          {/* We pass onTaskClick so that clicking a row fetches full details + opens modal */}
          <TasksTable tasks={tasks} onTaskClick={handleTaskClick} />
        </div>
      </main>

      {/* WorkOrderForm for adding new tasks */}
      {isWorkOrderFormOpen && (
        <WorkOrderForm
          onClose={() => setIsWorkOrderFormOpen(false)}
          onSave={handleSaveWorkOrder}
          onAddTask={handleAddTask}
        />
      )}

      {/* TaskDetailsModal: shows the full DB record (DetailedRepairOrder) */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}
