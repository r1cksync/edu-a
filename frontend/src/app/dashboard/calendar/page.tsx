'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin,
  Filter,
  FileText,
  BookOpen,
  HelpCircle,
  Video,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api'

interface CalendarEvent {
  id: string
  title: string
  description: string
  type: 'assignment' | 'dpp' | 'quiz' | 'video-class'
  date: string
  endDate?: string
  duration?: number
  classroom: {
    id: string
    name: string
  }
  color: string
  icon: string
  status?: string
}

interface GroupedEvents {
  [date: string]: CalendarEvent[]
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [groupedEvents, setGroupedEvents] = useState<GroupedEvents>({})
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all')
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [filterType, setFilterType] = useState<string>('all')

  const eventIcons = {
    'assignment': FileText,
    'dpp': BookOpen,
    'quiz': HelpCircle,
    'video-class': Video
  }

  const eventTypeColors = {
    'assignment': 'bg-red-100 text-red-800 border-red-200',
    'dpp': 'bg-purple-100 text-purple-800 border-purple-200',
    'quiz': 'bg-amber-100 text-amber-800 border-amber-200',
    'video-class': 'bg-emerald-100 text-emerald-800 border-emerald-200'
  }

  // Fetch calendar events
  const fetchCalendarEvents = async () => {
    try {
      setLoading(true)
      
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(selectedClassroom !== 'all' && { classroomId: selectedClassroom })
      }

      const data = await apiClient.getCalendarEvents(params) as any
      setEvents(data.data.events)
      setGroupedEvents(data.data.groupedEvents)
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      toast.error('Failed to fetch calendar events')
    } finally {
      setLoading(false)
    }
  }

  // Fetch upcoming events
  const fetchUpcomingEvents = async () => {
    try {
      const data = await apiClient.getUpcomingEvents(5) as any
      setUpcomingEvents(data.data.upcomingEvents)
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
    }
  }

  // Fetch user's classrooms
  const fetchClassrooms = async () => {
    try {
      const data = await apiClient.getClassrooms() as any
      setClassrooms(data.classrooms || [])
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }

  useEffect(() => {
    fetchClassrooms()
    fetchUpcomingEvents()
  }, [])

  useEffect(() => {
    fetchCalendarEvents()
  }, [currentDate, selectedClassroom])

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get days in month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i)
      days.push({
        date: day,
        isCurrentMonth: false,
        events: []
      })
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = date.toISOString().split('T')[0]
      const dayEvents = groupedEvents[dateKey] || []
      
      days.push({
        date: date,
        isCurrentMonth: true,
        events: filterType === 'all' ? dayEvents : dayEvents.filter(e => e.type === filterType)
      })
    }

    // Next month's leading days
    const totalCells = 42 // 6 rows × 7 days
    const remainingCells = totalCells - days.length
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date: date,
        isCurrentMonth: false,
        events: []
      })
    }

    return days
  }

  const formatEventTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const days = getDaysInMonth()
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Calendar */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {monthYear}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Classrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classrooms</SelectItem>
                    {classrooms.map((classroom) => (
                      <SelectItem key={classroom._id} value={classroom._id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="assignment">Assignments</SelectItem>
                    <SelectItem value="dpp">Daily Practice</SelectItem>
                    <SelectItem value="quiz">Quizzes</SelectItem>
                    <SelectItem value="video-class">Video Classes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`
                          min-h-24 p-1 border cursor-pointer transition-colors
                          ${day.isCurrentMonth ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-100 bg-gray-50/50'}
                          ${isToday(day.date) ? 'bg-blue-50 border-blue-200' : ''}
                          ${isSelected(day.date) ? 'bg-blue-100 border-blue-300' : ''}
                        `}
                        onClick={() => setSelectedDate(day.date)}
                      >
                        <div className={`text-sm ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} ${isToday(day.date) ? 'font-bold text-blue-600' : ''}`}>
                          {day.date.getDate()}
                        </div>
                        <div className="mt-1 space-y-1">
                          {day.events.slice(0, 3).map((event, eventIndex) => {
                            const IconComponent = eventIcons[event.type]
                            return (
                              <div
                                key={eventIndex}
                                className={`text-xs p-1 rounded truncate ${eventTypeColors[event.type]}`}
                                title={event.title}
                              >
                                <div className="flex items-center gap-1">
                                  <IconComponent className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{event.title}</span>
                                </div>
                              </div>
                            )
                          })}
                          {day.events.length > 3 && (
                            <div className="text-xs text-gray-500 font-medium">
                              +{day.events.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const IconComponent = eventIcons[event.type]
                    return (
                      <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${eventTypeColors[event.type]}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{event.title}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3" />
                              {event.classroom.name}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatEventTime(event.date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Date Events */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const dateKey = selectedDate.toISOString().split('T')[0]
                  const dayEvents = groupedEvents[dateKey] || []
                  const filteredEvents = filterType === 'all' ? dayEvents : dayEvents.filter(e => e.type === filterType)
                  
                  if (filteredEvents.length === 0) {
                    return <p className="text-gray-500 text-center py-4">No events for this date</p>
                  }

                  return (
                    <div className="space-y-3">
                      {filteredEvents.map((event) => {
                        const IconComponent = eventIcons[event.type]
                        return (
                          <div key={event.id} className="p-3 border rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${eventTypeColors[event.type]}`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{event.title}</h4>
                                {event.description && (
                                  <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {event.classroom.name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatEventTime(event.date)}
                                  </span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`mt-2 ${eventTypeColors[event.type]} text-xs`}
                                >
                                  {event.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(eventTypeColors).map(([type, colorClass]) => {
                  const IconComponent = eventIcons[type as keyof typeof eventIcons]
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`p-1 rounded ${colorClass}`}>
                        <IconComponent className="h-3 w-3" />
                      </div>
                      <span className="text-sm capitalize">
                        {type.replace('-', ' ')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}