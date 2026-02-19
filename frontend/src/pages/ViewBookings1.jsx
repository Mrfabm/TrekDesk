import React from 'react';
import EnhancedTable from '../components/EnhancedTable';
import { useLocation } from 'react-router-dom';

// Initial dummy data array
export const dummyData = [
  {
    id: 1,
    booking_name: "John Safari",
    booking_ref: "GOR-2025-001",
    invoice_no: "INV-25-001",
    number_of_permits: 2,
    voucher: "V-001-25",
    date_of_request: "2025-01-15",
    trekking_date: "2025-04-15",
    head_of_file: "James Smith",
    originating_agent: "Safari Adventures Ltd",
    product: "Mountain Gorillas",
    date: "2025-04-15",
    people: 2,
    total_amount: 3000,
    paid_amount: 3000,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Regular booking - fully paid"
  },
  {
    id: 2,
    booking_name: "Sarah Trek Group",
    booking_ref: "GOR-2025-002",
    invoice_no: "INV-25-002",
    number_of_permits: 4,
    voucher: "V-002-25",
    date_of_request: "2025-01-20",
    trekking_date: "2025-04-20",
    head_of_file: "Sarah Johnson",
    originating_agent: "Trek East Africa",
    product: "Golden Monkeys",
    date: "2025-04-20",
    people: 4,
    total_amount: 400,
    paid_amount: 200,
    booking_status: "provisional",
    payment_status: "deposit_paid",
    validation_status: "ok_to_purchase_deposit",
    notes: "Deposit paid, balance pending"
  },
  {
    id: 3,
    booking_name: "Adventure Group",
    booking_ref: "GOR-2025-003",
    invoice_no: "INV-25-003",
    number_of_permits: 6,
    voucher: "V-003-25",
    date_of_request: "2025-01-25",
    trekking_date: "2025-05-01",
    head_of_file: "Mike Adventure",
    originating_agent: "Adventure Tours",
    product: "Mountain Gorillas",
    date: "2025-05-01",
    people: 6,
    total_amount: 9000,
    paid_amount: 0,
    booking_status: "requested",
    payment_status: "pending",
    validation_status: "pending",
    notes: "Large group booking - payment pending"
  },
  {
    id: 4,
    booking_name: "Wildlife Tours",
    booking_ref: "GOR-2025-004",
    invoice_no: "INV-25-004",
    number_of_permits: 2,
    voucher: "V-004-25",
    date_of_request: "2025-01-10",
    trekking_date: "2025-04-25",
    head_of_file: "Robert Wildlife",
    originating_agent: "Wildlife Safaris",
    product: "Mountain Gorillas",
    date: "2025-04-25",
    people: 2,
    total_amount: 3000,
    paid_amount: 0,
    booking_status: "rejected",
    payment_status: "cancelled",
    validation_status: "do_not_purchase",
    notes: "Rejected due to validation issues"
  },
  {
    id: 5,
    booking_name: "Eco Explorers",
    booking_ref: "GOR-2025-005",
    invoice_no: "INV-25-005",
    number_of_permits: 3,
    voucher: "V-005-25",
    date_of_request: "2025-02-01",
    trekking_date: "2025-05-10",
    head_of_file: "Emma Eco",
    originating_agent: "Eco Tours",
    product: "Golden Monkeys",
    date: "2025-05-10",
    people: 3,
    total_amount: 300,
    paid_amount: 150,
    booking_status: "amended",
    payment_status: "partial",
    validation_status: "ok_to_purchase_deposit",
    notes: "Date amended - additional payment required"
  },
  {
    id: 6,
    booking_name: "Nature Group",
    booking_ref: "GOR-2025-006",
    invoice_no: "INV-25-006",
    number_of_permits: 4,
    voucher: "V-006-25",
    date_of_request: "2025-02-15",
    trekking_date: "2025-06-01",
    head_of_file: "David Nature",
    originating_agent: "Nature Expeditions",
    product: "Mountain Gorillas",
    date: "2025-06-01",
    people: 4,
    total_amount: 6000,
    paid_amount: 6000,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Group booking - all requirements met"
  },
  {
    id: 7,
    booking_name: "Solo Explorer",
    booking_ref: "GOR-2025-007",
    invoice_no: "INV-25-007",
    number_of_permits: 1,
    voucher: "V-007-25",
    date_of_request: "2025-02-10",
    trekking_date: "2025-05-15",
    head_of_file: "Peter Solo",
    originating_agent: "Explorer Tours",
    product: "Golden Monkeys",
    date: "2025-05-15",
    people: 1,
    total_amount: 100,
    paid_amount: 0,
    booking_status: "provisional",
    payment_status: "overdue",
    validation_status: "pending",
    notes: "Payment overdue - requires follow-up"
  },
  {
    id: 8,
    booking_name: "Family Adventure",
    booking_ref: "GOR-2025-008",
    invoice_no: "INV-25-008",
    number_of_permits: 5,
    voucher: "V-008-25",
    date_of_request: "2025-02-20",
    trekking_date: "2025-06-15",
    head_of_file: "Tom Family",
    originating_agent: "Family Safaris",
    product: "Mountain Gorillas",
    date: "2025-06-15",
    people: 5,
    total_amount: 7500,
    paid_amount: 3750,
    booking_status: "confirmed",
    payment_status: "partial",
    validation_status: "ok_to_purchase_deposit",
    notes: "Family group - partial payment received"
  },
  {
    id: 9,
    booking_name: "Corporate Group",
    booking_ref: "GOR-2025-009",
    invoice_no: "INV-25-009",
    number_of_permits: 8,
    voucher: "V-009-25",
    date_of_request: "2025-03-01",
    trekking_date: "2025-07-01",
    head_of_file: "Corporate Events",
    originating_agent: "Business Tours",
    product: "Mountain Gorillas",
    date: "2025-07-01",
    people: 8,
    total_amount: 12000,
    paid_amount: 12000,
    booking_status: "amended",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Corporate event - date changed but fully paid"
  },
  {
    id: 10,
    booking_name: "Last Minute Booking",
    booking_ref: "GOR-2025-010",
    invoice_no: "INV-25-010",
    number_of_permits: 2,
    voucher: "V-010-25",
    date_of_request: "2025-03-05",
    trekking_date: "2025-03-10",
    head_of_file: "Quick Book",
    originating_agent: "Express Tours",
    product: "Golden Monkeys",
    date: "2025-03-10",
    people: 2,
    total_amount: 200,
    paid_amount: 0,
    booking_status: "requested",
    payment_status: "pending",
    validation_status: "pending",
    notes: "Urgent booking - awaiting validation"
  },
  {
    id: 11,
    booking_name: "Honeymoon Special",
    booking_ref: "GOR-2025-011",
    invoice_no: "INV-25-011",
    number_of_permits: 2,
    voucher: "V-011-25",
    date_of_request: "2025-03-15",
    trekking_date: "2025-08-01",
    head_of_file: "Honeymoon Couple",
    originating_agent: "Romance Tours",
    product: "Mountain Gorillas",
    date: "2025-08-01",
    people: 2,
    total_amount: 3000,
    paid_amount: 1500,
    booking_status: "confirmed",
    payment_status: "deposit_paid",
    validation_status: "ok_to_purchase_deposit",
    notes: "Honeymoon package - deposit secured"
  },
  {
    id: 12,
    booking_name: "Photography Group",
    booking_ref: "GOR-2025-012",
    invoice_no: "INV-25-012",
    number_of_permits: 4,
    voucher: "V-012-25",
    date_of_request: "2025-03-20",
    trekking_date: "2025-09-01",
    head_of_file: "Photo Safari",
    originating_agent: "Photography Tours",
    product: "Mountain Gorillas",
    date: "2025-09-01",
    people: 4,
    total_amount: 6000,
    paid_amount: 0,
    booking_status: "rejected",
    payment_status: "cancelled",
    validation_status: "do_not_purchase",
    notes: "Cancelled due to permit availability"
  },
  {
    id: 13,
    booking_name: "Research Team",
    booking_ref: "GOR-2025-013",
    invoice_no: "INV-25-013",
    number_of_permits: 3,
    voucher: "V-013-25",
    date_of_request: "2025-04-01",
    trekking_date: "2025-10-01",
    head_of_file: "Research Lead",
    originating_agent: "Academic Tours",
    product: "Mountain Gorillas",
    date: "2025-10-01",
    people: 3,
    total_amount: 4500,
    paid_amount: 4500,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Research permit - special arrangements"
  },
  {
    id: 14,
    booking_name: "Student Group",
    booking_ref: "GOR-2025-014",
    invoice_no: "INV-25-014",
    number_of_permits: 10,
    voucher: "V-014-25",
    date_of_request: "2025-04-05",
    trekking_date: "2025-11-01",
    head_of_file: "Education Tours",
    originating_agent: "School Trips",
    product: "Golden Monkeys",
    date: "2025-11-01",
    people: 10,
    total_amount: 1000,
    paid_amount: 500,
    booking_status: "provisional",
    payment_status: "deposit_paid",
    validation_status: "ok_to_purchase_deposit",
    notes: "Student group - special rate applied"
  },
  {
    id: 15,
    booking_name: "VIP Client",
    booking_ref: "GOR-2025-015",
    invoice_no: "INV-25-015",
    number_of_permits: 2,
    voucher: "V-015-25",
    date_of_request: "2025-04-10",
    trekking_date: "2025-12-01",
    head_of_file: "VIP Services",
    originating_agent: "Luxury Safaris",
    product: "Mountain Gorillas",
    date: "2025-12-01",
    people: 2,
    total_amount: 3000,
    paid_amount: 3000,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "VIP arrangements - private guide requested"
  },
  {
    id: 16,
    booking_name: "International School Trip",
    booking_ref: "GOR-2025-016",
    invoice_no: "INV-25-016",
    number_of_permits: 15,
    voucher: "V-016-25",
    date_of_request: "2025-04-15",
    trekking_date: "2025-12-15",
    head_of_file: "School Coordinator",
    originating_agent: "Global Education Tours",
    product: "Mountain Gorillas",
    date: "2025-12-15",
    people: 15,
    total_amount: 22500,
    paid_amount: 11250,
    booking_status: "provisional",
    payment_status: "deposit_paid",
    validation_status: "pending",
    notes: "Large school group - special arrangements required"
  },
  {
    id: 17,
    booking_name: "Documentary Crew",
    booking_ref: "GOR-2025-017",
    invoice_no: "INV-25-017",
    number_of_permits: 5,
    voucher: "V-017-25",
    date_of_request: "2025-04-20",
    trekking_date: "2025-08-15",
    head_of_file: "Film Director",
    originating_agent: "Wildlife Productions",
    product: "Mountain Gorillas",
    date: "2025-08-15",
    people: 5,
    total_amount: 7500,
    paid_amount: 7500,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Documentary filming - special permits arranged"
  },
  {
    id: 18,
    booking_name: "Senior Citizens Group",
    booking_ref: "GOR-2025-018",
    invoice_no: "INV-25-018",
    number_of_permits: 6,
    voucher: "V-018-25",
    date_of_request: "2025-05-01",
    trekking_date: "2025-09-10",
    head_of_file: "Senior Tours",
    originating_agent: "Elder Adventures",
    product: "Golden Monkeys",
    date: "2025-09-10",
    people: 6,
    total_amount: 600,
    paid_amount: 300,
    booking_status: "provisional",
    payment_status: "partial",
    validation_status: "ok_to_purchase_deposit",
    notes: "Senior group - easy trail requested"
  },
  {
    id: 19,
    booking_name: "Last-Minute Cancellation",
    booking_ref: "GOR-2025-019",
    invoice_no: "INV-25-019",
    number_of_permits: 2,
    voucher: "V-019-25",
    date_of_request: "2025-05-05",
    trekking_date: "2025-05-07",
    head_of_file: "Cancel Request",
    originating_agent: "Quick Tours",
    product: "Mountain Gorillas",
    date: "2025-05-07",
    people: 2,
    total_amount: 3000,
    paid_amount: 1500,
    booking_status: "rejected",
    payment_status: "cancelled",
    validation_status: "do_not_purchase",
    notes: "Cancelled 2 days before trek - refund pending"
  },
  {
    id: 20,
    booking_name: "Medical Research Team",
    booking_ref: "GOR-2025-020",
    invoice_no: "INV-25-020",
    number_of_permits: 4,
    voucher: "V-020-25",
    date_of_request: "2025-05-10",
    trekking_date: "2025-10-15",
    head_of_file: "Dr. Research",
    originating_agent: "Medical Institute",
    product: "Mountain Gorillas",
    date: "2025-10-15",
    people: 4,
    total_amount: 6000,
    paid_amount: 6000,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Research permits with special equipment"
  },
  {
    id: 21,
    booking_name: "Diplomatic Visit",
    booking_ref: "GOR-2025-021",
    invoice_no: "INV-25-021",
    number_of_permits: 3,
    voucher: "V-021-25",
    date_of_request: "2025-05-15",
    trekking_date: "2025-07-20",
    head_of_file: "Embassy Official",
    originating_agent: "Diplomatic Services",
    product: "Mountain Gorillas",
    date: "2025-07-20",
    people: 3,
    total_amount: 4500,
    paid_amount: 4500,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "VIP diplomatic delegation"
  },
  {
    id: 22,
    booking_name: "Conservation Team",
    booking_ref: "GOR-2025-022",
    invoice_no: "INV-25-022",
    number_of_permits: 5,
    voucher: "V-022-25",
    date_of_request: "2025-05-20",
    trekking_date: "2025-08-20",
    head_of_file: "Conservation Lead",
    originating_agent: "Wildlife Conservation",
    product: "Mountain Gorillas",
    date: "2025-08-20",
    people: 5,
    total_amount: 7500,
    paid_amount: 3750,
    booking_status: "provisional",
    payment_status: "deposit_paid",
    validation_status: "ok_to_purchase_deposit",
    notes: "Conservation project team visit"
  },
  {
    id: 23,
    booking_name: "Wedding Photo Shoot",
    booking_ref: "GOR-2025-023",
    invoice_no: "INV-25-023",
    number_of_permits: 4,
    voucher: "V-023-25",
    date_of_request: "2025-06-01",
    trekking_date: "2025-09-15",
    head_of_file: "Wedding Planner",
    originating_agent: "Wedding Adventures",
    product: "Golden Monkeys",
    date: "2025-09-15",
    people: 4,
    total_amount: 400,
    paid_amount: 0,
    booking_status: "requested",
    payment_status: "pending",
    validation_status: "pending",
    notes: "Wedding photography session"
  },
  {
    id: 24,
    booking_name: "Corporate Retreat",
    booking_ref: "GOR-2025-024",
    invoice_no: "INV-25-024",
    number_of_permits: 12,
    voucher: "V-024-25",
    date_of_request: "2025-06-05",
    trekking_date: "2025-10-20",
    head_of_file: "Corporate Lead",
    originating_agent: "Business Events Ltd",
    product: "Mountain Gorillas",
    date: "2025-10-20",
    people: 12,
    total_amount: 18000,
    paid_amount: 9000,
    booking_status: "provisional",
    payment_status: "deposit_paid",
    validation_status: "ok_to_purchase_deposit",
    notes: "Team building retreat"
  },
  {
    id: 25,
    booking_name: "Youth Adventure Program",
    booking_ref: "GOR-2025-025",
    invoice_no: "INV-25-025",
    number_of_permits: 8,
    voucher: "V-025-25",
    date_of_request: "2025-06-10",
    trekking_date: "2025-11-15",
    head_of_file: "Youth Coordinator",
    originating_agent: "Youth Expeditions",
    product: "Golden Monkeys",
    date: "2025-11-15",
    people: 8,
    total_amount: 800,
    paid_amount: 400,
    booking_status: "amended",
    payment_status: "partial",
    validation_status: "ok_to_purchase_deposit",
    notes: "Youth program with educational focus"
  },
  {
    id: 26,
    booking_name: "Charity Foundation",
    booking_ref: "GOR-2025-026",
    invoice_no: "INV-25-026",
    number_of_permits: 6,
    voucher: "V-026-25",
    date_of_request: "2025-06-15",
    trekking_date: "2025-12-20",
    head_of_file: "Foundation Head",
    originating_agent: "Charity Tours",
    product: "Mountain Gorillas",
    date: "2025-12-20",
    people: 6,
    total_amount: 9000,
    paid_amount: 9000,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Charity foundation annual visit"
  },
  {
    id: 27,
    booking_name: "Bird Watchers Group",
    booking_ref: "GOR-2025-027",
    invoice_no: "INV-25-027",
    number_of_permits: 4,
    voucher: "V-027-25",
    date_of_request: "2025-06-20",
    trekking_date: "2025-10-25",
    head_of_file: "Bird Expert",
    originating_agent: "Bird Watch Tours",
    product: "Golden Monkeys",
    date: "2025-10-25",
    people: 4,
    total_amount: 400,
    paid_amount: 0,
    booking_status: "rejected",
    payment_status: "cancelled",
    validation_status: "do_not_purchase",
    notes: "Cancelled due to scheduling conflict"
  },
  {
    id: 28,
    booking_name: "Adventure Athletes",
    booking_ref: "GOR-2025-028",
    invoice_no: "INV-25-028",
    number_of_permits: 3,
    voucher: "V-028-25",
    date_of_request: "2025-06-25",
    trekking_date: "2025-09-25",
    head_of_file: "Sports Team",
    originating_agent: "Athletes Adventures",
    product: "Mountain Gorillas",
    date: "2025-09-25",
    people: 3,
    total_amount: 4500,
    paid_amount: 2250,
    booking_status: "provisional",
    payment_status: "partial",
    validation_status: "ok_to_purchase_deposit",
    notes: "Professional athletes documentary"
  },
  {
    id: 29,
    booking_name: "Cultural Exchange",
    booking_ref: "GOR-2025-029",
    invoice_no: "INV-25-029",
    number_of_permits: 7,
    voucher: "V-029-25",
    date_of_request: "2025-07-01",
    trekking_date: "2025-11-20",
    head_of_file: "Exchange Coordinator",
    originating_agent: "Cultural Tours",
    product: "Mountain Gorillas",
    date: "2025-11-20",
    people: 7,
    total_amount: 10500,
    paid_amount: 5250,
    booking_status: "confirmed",
    payment_status: "deposit_paid",
    validation_status: "ok_to_purchase_deposit",
    notes: "International cultural exchange program"
  },
  {
    id: 30,
    booking_name: "Art Collective",
    booking_ref: "GOR-2025-030",
    invoice_no: "INV-25-030",
    number_of_permits: 5,
    voucher: "V-030-25",
    date_of_request: "2025-07-05",
    trekking_date: "2025-12-10",
    head_of_file: "Art Director",
    originating_agent: "Creative Expeditions",
    product: "Golden Monkeys",
    date: "2025-12-10",
    people: 5,
    total_amount: 500,
    paid_amount: 500,
    booking_status: "confirmed",
    payment_status: "fully_paid",
    validation_status: "ok_to_purchase_full",
    notes: "Artists capturing wildlife"
  }
];

// Generate more data function
export const generateMoreData = () => {
  const baseData = [...dummyData]; // Keep existing 30 entries
  
  // Add some bookings for today
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');
  
  // Fixed today's bookings
  const todayBookings = [
    {
      id: 31,
      booking_name: "Today's VIP Group",
      booking_ref: "GOR-2025-031",
      invoice_no: "INV-25-031",
      number_of_permits: 4,
      voucher: "V-031-25",
      date_of_request: todayString,
      trekking_date: `2025-${todayMonth}-${todayDay}`,
      head_of_file: "VIP Lead",
      originating_agent: "Premium Safaris",
      product: "Mountain Gorillas",
      date: `2025-${todayMonth}-${todayDay}`,
      people: 4,
      total_amount: 6000,
      paid_amount: 6000,
      booking_status: "confirmed",
      payment_status: "fully_paid",
      validation_status: "ok_to_purchase_full",
      notes: "Same day VIP booking - priority handling"
    },
    {
      id: 32,
      booking_name: "Urgent Booking Request",
      booking_ref: "GOR-2025-032",
      invoice_no: "INV-25-032",
      number_of_permits: 2,
      voucher: "V-032-25",
      date_of_request: todayString,
      trekking_date: `2025-${todayMonth}-${todayDay}`,
      head_of_file: "Quick Book",
      originating_agent: "Fast Track Tours",
      product: "Golden Monkeys",
      date: `2025-${todayMonth}-${todayDay}`,
      people: 2,
      total_amount: 200,
      paid_amount: 0,
      booking_status: "requested",
      payment_status: "pending",
      validation_status: "pending",
      notes: "Urgent same day request - awaiting validation"
    },
    {
      id: 33,
      booking_name: "Last Minute Group",
      booking_ref: "GOR-2025-033",
      invoice_no: "INV-25-033",
      number_of_permits: 6,
      voucher: "V-033-25",
      date_of_request: todayString,
      trekking_date: `2025-${todayMonth}-${todayDay}`,
      head_of_file: "Express Lead",
      originating_agent: "Quick Tours",
      product: "Mountain Gorillas",
      date: `2025-${todayMonth}-${todayDay}`,
      people: 6,
      total_amount: 9000,
      paid_amount: 4500,
      booking_status: "provisional",
      payment_status: "deposit_paid",
      validation_status: "ok_to_purchase_deposit",
      notes: "Same day group booking - deposit received"
    },
    {
      id: 34,
      booking_name: "Emergency Request",
      booking_ref: "GOR-2025-034",
      invoice_no: "INV-25-034",
      number_of_permits: 3,
      voucher: "V-034-25",
      date_of_request: todayString,
      trekking_date: `2025-${todayMonth}-${todayDay}`,
      head_of_file: "Priority Handler",
      originating_agent: "Emergency Tours",
      product: "Mountain Gorillas",
      date: `2025-${todayMonth}-${todayDay}`,
      people: 3,
      total_amount: 4500,
      paid_amount: 4500,
      booking_status: "confirmed",
      payment_status: "fully_paid",
      validation_status: "ok_to_purchase_full",
      notes: "Emergency booking - fully processed"
    },
    {
      id: 35,
      booking_name: "Today's Special",
      booking_ref: "GOR-2025-035",
      invoice_no: "INV-25-035",
      number_of_permits: 8,
      voucher: "V-035-25",
      date_of_request: todayString,
      trekking_date: `2025-${todayMonth}-${todayDay}`,
      head_of_file: "Special Events",
      originating_agent: "Special Tours",
      product: "Golden Monkeys",
      date: `2025-${todayMonth}-${todayDay}`,
      people: 8,
      total_amount: 800,
      paid_amount: 0,
      booking_status: "requested",
      payment_status: "pending",
      validation_status: "pending",
      notes: "Special group booking - under review"
    }
  ];
  
  // Generate fixed entries from 36 to 300
  const newData = [];
  const products = ["Mountain Gorillas", "Golden Monkeys"];
  const clientTypes = [
    "Family", "Corporate", "School", "Research", "Media", "Individual", 
    "Government", "NGO", "University", "Travel Agency", "Sports Team",
    "Cultural Group", "Religious Group", "Medical Team", "Conservation",
    "Photography", "Wildlife", "Adventure", "Luxury", "Budget", 
    "Senior", "Youth", "Honeymoon", "Business", "Charity"
  ];

  for(let i = 36; i <= 300; i++) {
    // Use deterministic values based on the index
    const month = String(Math.floor((i % 12) + 1)).padStart(2, '0');
    const day = String(Math.floor((i % 28) + 1)).padStart(2, '0');
    const trekMonth = String(Math.floor((i % 12) + 1)).padStart(2, '0');
    const trekDay = String(Math.floor((i % 28) + 1)).padStart(2, '0');
    
    // Deterministic product selection based on index
    const product = products[i % 2];
    const permits = (i % 10) + 1; // 1-10 permits based on index
    const totalAmount = product === "Mountain Gorillas" ? permits * 1500 : permits * 100;
    
    // Deterministic status selection based on index
    const bookingStatus = ["confirmed", "provisional", "requested", "rejected", "amended"][i % 5];
    const paymentStatus = ["fully_paid", "deposit_paid", "pending", "cancelled", "partial", "overdue"][i % 6];
    const validationStatus = ["ok_to_purchase_full", "ok_to_purchase_deposit", "pending", "do_not_purchase"][i % 4];
    
    // Calculate paid amount deterministically based on payment status
    let paidAmount = 0;
    switch(paymentStatus) {
      case 'fully_paid':
        paidAmount = totalAmount;
        break;
      case 'deposit_paid':
        paidAmount = totalAmount * 0.5;
        break;
      case 'partial':
        paidAmount = totalAmount * 0.3; // Always 30% paid for partial
        break;
      case 'cancelled':
      case 'pending':
      case 'overdue':
        paidAmount = 0;
        break;
    }
    
    // Deterministic client type selection based on index
    const clientType = clientTypes[i % clientTypes.length];
    
    newData.push({
      id: i,
      booking_name: `${clientType} Group ${i}`,
      booking_ref: `GOR-2025-${String(i).padStart(3, '0')}`,
      invoice_no: `INV-25-${String(i).padStart(3, '0')}`,
      number_of_permits: permits,
      voucher: `V-${String(i).padStart(3, '0')}-25`,
      date_of_request: `2025-${month}-${day}`,
      trekking_date: `2025-${trekMonth}-${trekDay}`,
      head_of_file: `${clientType} Lead ${i}`,
      originating_agent: `${clientType} Agency ${Math.floor(i/10)}`,
      product: product,
      date: `2025-${trekMonth}-${trekDay}`,
      people: permits,
      total_amount: totalAmount,
      paid_amount: Math.floor(paidAmount),
      booking_status: bookingStatus,
      payment_status: paymentStatus,
      validation_status: validationStatus,
      notes: `${clientType} group ${i} - ${permits} permits - ${bookingStatus}`
    });
  }
  
  return [...baseData, ...todayBookings, ...newData];
};

// Generate the data once and export it
const generatedData = generateMoreData();
export const allBookingsData = generatedData;

const ViewBookings1 = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get('filter');

  // Use allBookingsData directly instead of generating new data
  const allData = React.useMemo(() => allBookingsData, []);

  const filterData = (data) => {
    if (!filterParam) return data;

    switch (filterParam) {
      // Immediate Attention Filters
      case 'quick_actions':
        return data.filter(item => 
          item.booking_status === 'requested' || // Confirmation requests
          item.validation_status === 'ok_to_purchase_full' || // OK to Purchase (Full)
          item.validation_status === 'ok_to_purchase_deposit' || // OK to Purchase (Deposit)
          item.validation_status === 'do_not_purchase' // Do Not Purchase
        );
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        return data.filter(item => item.date_of_request?.split('T')[0] === today);
      case 'critical':
        return data.filter(item => item.validation_status === 'do_not_purchase');
      case 'amendments':
        return data.filter(item => item.booking_status === 'amended');
      case 'cancellations':
        return data.filter(item => item.booking_status === 'rejected');
      case 'pending_payments':
        return data.filter(item => ['pending', 'partial', 'overdue'].includes(item.payment_status));
      
      // Confirmed Bookings Filters
      case 'confirmed_full_payment':
        return data.filter(item => item.payment_status === 'fully_paid');
      case 'confirmed_deposit':
        return data.filter(item => item.payment_status === 'deposit_paid');
      case 'confirmed_rolling_deposit':
        return data.filter(item => item.payment_status === 'rolling_deposit');
      case 'confirmed_authorized':
        return data.filter(item => item.payment_status === 'authorized');
      
      // Amendment Filters
      case 'amendments_under_amendment':
        return data.filter(item => item.booking_status === 'amended' && item.payment_status !== 'fully_paid');
      case 'amendments_completed':
        return data.filter(item => item.booking_status === 'amended' && item.payment_status === 'fully_paid');
      case 'amendments_declined':
        return data.filter(item => item.booking_status === 'rejected');
      
      // Cancellation Filters
      case 'cancellations_under_cancellation':
        return data.filter(item => item.booking_status === 'rejected' && item.payment_status !== 'cancelled');
      case 'cancellations_completed':
        return data.filter(item => item.booking_status === 'rejected' && item.payment_status === 'cancelled');
      
      // Pending Actions Filters
      case 'pending_no_payment':
        return data.filter(item => item.payment_status === 'pending');
      case 'pending_missing_details':
        return data.filter(item => item.booking_status === 'requested' && item.validation_status === 'pending');
      case 'pending_deposit_due':
        return data.filter(item => item.validation_status === 'ok_to_purchase_deposit');
      case 'pending_authorization_due':
        return data.filter(item => item.booking_status === 'provisional' && item.validation_status === 'pending');
      
      // Quick Actions Filters
      case 'confirmation_requests':
        return data.filter(item => item.booking_status === 'requested');
      case 'ok_to_purchase_full':
        return data.filter(item => item.validation_status === 'ok_to_purchase_full');
      case 'ok_to_purchase_deposit':
        return data.filter(item => item.validation_status === 'ok_to_purchase_deposit');
      case 'do_not_purchase':
        return data.filter(item => item.validation_status === 'do_not_purchase');
      
      // Additional Key Metrics Filters
      case 'confirmed_bookings':
        return data.filter(item => item.booking_status === 'confirmed');
      case 'confirmed_full_payment':
        return data.filter(item => item.booking_status === 'confirmed' && item.payment_status === 'fully_paid');
      case 'confirmed_deposit':
        return data.filter(item => item.booking_status === 'confirmed' && item.payment_status === 'deposit_paid');
      case 'confirmed_rolling_deposit':
        return data.filter(item => item.booking_status === 'confirmed' && item.payment_status === 'rolling_deposit');
      case 'confirmed_authorized':
        return data.filter(item => item.booking_status === 'confirmed' && item.payment_status === 'authorized');
      
      // Amendments section filters
      case 'amendments_total':
        return data.filter(item => item.booking_status === 'amended');
      case 'amendments_under':
        return data.filter(item => item.booking_status === 'amended' && item.payment_status !== 'fully_paid');
      case 'amendments_completed':
        return data.filter(item => item.booking_status === 'amended' && item.payment_status === 'fully_paid');
      case 'amendments_declined':
        return data.filter(item => item.booking_status === 'rejected');
      
      // Cancellations section filters
      case 'cancellations_total':
        return data.filter(item => item.booking_status === 'rejected');
      case 'cancellations_under':
        return data.filter(item => item.booking_status === 'rejected' && item.payment_status !== 'cancelled');
      case 'cancellations_completed':
        return data.filter(item => item.booking_status === 'rejected' && item.payment_status === 'cancelled');
      
      // Pending Actions section filters
      case 'pending_total':
        return data.filter(item => 
          item.payment_status === 'pending' || 
          (item.booking_status === 'requested' && item.validation_status === 'pending') ||
          item.validation_status === 'ok_to_purchase_deposit' ||
          (item.booking_status === 'provisional' && item.validation_status === 'pending')
        );
      case 'pending_no_payment':
        return data.filter(item => item.payment_status === 'pending');
      case 'pending_missing_details':
        return data.filter(item => item.booking_status === 'requested' && item.validation_status === 'pending');
      case 'pending_deposit_due':
        return data.filter(item => item.validation_status === 'ok_to_purchase_deposit');
      case 'pending_authorization_due':
        return data.filter(item => item.booking_status === 'provisional' && item.validation_status === 'pending');
      
      // Today's Bookings section filters
      case 'today_fully_paid': {
        const todayDate = new Date().toISOString().split('T')[0];
        return data.filter(item => 
          item.date_of_request?.split('T')[0] === todayDate && 
          item.booking_status === 'confirmed' && 
          item.payment_status === 'fully_paid'
        );
      }
      case 'today_deposit': {
        const todayForDeposit = new Date().toISOString().split('T')[0];
        return data.filter(item => 
          item.date_of_request?.split('T')[0] === todayForDeposit && 
          item.booking_status === 'confirmed' && 
          item.payment_status === 'deposit_paid'
        );
      }
      case 'today_authorized': {
        const todayForAuth = new Date().toISOString().split('T')[0];
        return data.filter(item => 
          item.date_of_request?.split('T')[0] === todayForAuth && 
          item.booking_status === 'confirmed' && 
          item.payment_status === 'authorized'
        );
      }

      // Critical Deadlines section filters
      case 'critical_deadlines':
        return data.filter(item => item.validation_status === 'do_not_purchase');
      case 'warning_deadlines':
        return data.filter(item => item.validation_status === 'pending');
      
      default:
        return data;
    }
  };

  // Get the filtered data from the complete dataset
  const filteredData = React.useMemo(() => filterData(allData), [allData, filterParam]);

  console.log('Total number of bookings:', allData.length);
  console.log('Filtered bookings:', filteredData.length);

  // Helper functions for status colors
  const getBookingStatusColor = (status) => {
    const colors = {
      confirmed: "bg-green-100 text-green-800",
      provisional: "bg-yellow-100 text-yellow-800",
      requested: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      amended: "bg-purple-100 text-purple-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      fully_paid: "bg-green-100 text-green-800",
      deposit_paid: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      partial: "bg-orange-100 text-orange-800",
      overdue: "bg-pink-100 text-pink-800",
      authorized: "bg-purple-100 text-purple-800",
      rolling_deposit: "bg-indigo-100 text-indigo-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getValidationStatusColor = (status) => {
    const colors = {
      ok_to_purchase_full: "bg-green-100 text-green-800",
      ok_to_purchase_deposit: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
      do_not_purchase: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Updated columns configuration with row number
  const columns = [
    {
      header: "#",
      accessor: "id",
      cellClassName: "px-4 py-2 text-sm text-gray-600 text-center",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 text-center",
      width: "60px"
    },
    {
      header: "Booking Name",
      accessor: "booking_name",
      cellClassName: "px-4 py-2 text-sm font-medium text-gray-900 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "180px"
    },
    {
      header: "Booking Ref",
      accessor: "booking_ref",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Invoice No.",
      accessor: "invoice_no",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "No. Permits",
      accessor: "number_of_permits",
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-center truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Voucher",
      accessor: "voucher",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Request Date",
      accessor: "date_of_request",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Trek Date",
      accessor: "trekking_date",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Head of File",
      accessor: "head_of_file",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Agent/Client",
      accessor: "originating_agent",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Product",
      accessor: "product",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Date",
      accessor: "date",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "People",
      accessor: "people",
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-center truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "80px"
    },
    {
      header: "Total",
      accessor: "total_amount",
      cell: (value) => `$${value.toLocaleString()}`,
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-right truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Paid",
      accessor: "paid_amount",
      cell: (value) => `$${value.toLocaleString()}`,
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-right truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Booking Status",
      accessor: "booking_status",
      cell: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getBookingStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      cellClassName: "px-4 py-2 text-sm",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    },
    {
      header: "Payment Status",
      accessor: "payment_status",
      cell: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getPaymentStatusColor(value)}`}>
          {value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      ),
      cellClassName: "px-4 py-2 text-sm",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    },
    {
      header: "Validation Status",
      accessor: "validation_status",
      cell: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getValidationStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      cellClassName: "px-4 py-2 text-sm",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    }
  ];

  return (
    <EnhancedTable
      columns={columns}
      data={filteredData}
      totalRows={allData.length}
      filteredRows={filteredData.length}
    />
  );
};

export default ViewBookings1;