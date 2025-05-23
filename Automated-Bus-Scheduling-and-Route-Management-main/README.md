# DelhiDrive - A Bus Transport Management System

## Overview

The Bus Transport Management System is a comprehensive solution designed to streamline bus scheduling and management. This system integrates functionalities for both administrators and operators to manage bus schedules, assignments, and communications effectively. Built with Express.js for the web application and Python for predictive modeling, this system ensures real-time updates and efficient management.

## Tech Stack

- **Frontend**: HTML, CSS, JS
- **Backend**: Node.js, Express.js
- **Predictive Modeling**: Python
- **Database**: SQLite

## Features

### Admin Dashboard

## 1. Prediction Modules and Alerts
The prediction module empowers the admin to forecast bus schedules and operational anomalies based on historical data. This feature utilizes advanced machine learning models, such as SARIMAX, to train and test predictions, ensuring high accuracy. The system evaluates model performance using metrics like RMSE, enabling the admin to make well-informed decisions. Integrated with this module is an alert system that detects threshold breaches in the operations, automatically notifying the admin of potential issues, allowing for timely intervention and minimizing disruptions in service.

## 2. Operational Dashboards and Scheduling
The operational dashboard provides the admin with a dynamic overview of the current bus network status, including active buses, ongoing routes, drivers on leave, and operators on duty. This dashboard simplifies scheduling by offering a user-friendly interface to assign operators to buses, monitor route performance, and adjust schedules in real-time based on operational needs. This feature ensures efficient utilization of resources, reducing downtime and improving the overall management of the bus fleet.

### Driver Dashboard

1. **Notifications**: Receive updates about bus assignments and schedules.
2. **Feedback**: Submit feedback regarding bus issues.
3. **Leave Management**: Apply for leave.
4. **Shift Swap**: Request shift swaps.
5. **Emergency Contacts**: View emergency contact information.
