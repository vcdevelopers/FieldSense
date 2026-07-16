import io
import datetime
from django.db.models import Sum, Count, Q
from django.utils import timezone
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from collections import defaultdict

from field_tracking.models import AdHocMeeting, VisitLog
from django.contrib.auth.models import User

def generate_report_data(start_date, end_date):
    """
    Gathers metrics, generates charts as BytesIO objects, and fetches chronological employee timelines.
    """
    # Filter base querysets
    meetings = AdHocMeeting.objects.filter(created_at__range=(start_date, end_date))
    visits = VisitLog.objects.filter(check_in_time__range=(start_date, end_date))

    # 1. Global Metrics Gathering
    total_meetings = meetings.count()
    completed_meetings = meetings.filter(status='Closed').count()
    missed_meetings = meetings.filter(status__in=['Delayed', 'Upcoming']).count() 

    distance_sum = meetings.aggregate(Sum('distance_km'))['distance_km__sum'] or 0.0
    fuel_cost_sum = meetings.aggregate(Sum('fuel_cost'))['fuel_cost__sum'] or 0.0

    moms_q = ~Q(report_data__isnull=True) & ~Q(report_data='') & ~Q(report_data='{}') & ~Q(report_data=dict())
    total_moms_submitted = meetings.filter(moms_q).count()
    total_site_visits = visits.count()

    # 2. Employee Level Aggregations
    emp_stats = {}
    
    # Process Meetings
    emp_meetings = meetings.values('employee__username').annotate(
        total_meetings=Count('id'),
        completed=Count('id', filter=Q(status='Closed')),
        missed=Count('id', filter=Q(status__in=['Delayed', 'Upcoming'])),
        moms=Count('id', filter=moms_q),
        distance=Sum('distance_km'),
        fuel_cost=Sum('fuel_cost')
    )
    
    for stat in emp_meetings:
        emp = stat['employee__username']
        if not emp: continue
        emp_stats[emp] = {
            "name": emp,
            "meetings": stat['total_meetings'],
            "completed": stat['completed'],
            "missed": stat['missed'],
            "moms": stat['moms'],
            "distance": round(stat['distance'] or 0.0, 2),
            "fuel_cost": round(stat['fuel_cost'] or 0.0, 2),
            "visits": 0
        }
        
    # Process Visits
    emp_visits = visits.values('employee__username').annotate(total=Count('id'))
    for stat in emp_visits:
        emp = stat['employee__username']
        if not emp: continue
        if emp not in emp_stats:
            emp_stats[emp] = {
                "name": emp, "meetings": 0, "completed": 0, "missed": 0,
                "moms": 0, "distance": 0.0, "fuel_cost": 0.0, "visits": 0
            }
        emp_stats[emp]['visits'] += stat['total']

    # Sort by lowest completion rate first (Ascending order of completion %)
    employee_list = sorted(
        list(emp_stats.values()), 
        key=lambda x: (x['completed'] / x['meetings'] * 100) if x['meetings'] > 0 else 100
    )

    # 3. Generate Visualizations
    charts = {}
    sns.set_theme(style="whitegrid", palette="muted")
    
    # Chart 1: Employee Performance (Completion %)
    if employee_list:
        names = [e['name'][:10] for e in employee_list[:10]] # Top 10
        rates = [(e['completed'] / e['meetings'] * 100) if e['meetings'] > 0 else 0 for e in employee_list[:10]]
        
        fig1, ax1 = plt.subplots(figsize=(6, 4))
        x = np.arange(len(names))
        
        ax1.bar(x, rates, 0.5, color='#1db1e2')
        
        ax1.set_ylabel('Completion Rate (%)')
        ax1.set_ylim(0, 100)
        ax1.set_xticks(x)
        ax1.set_xticklabels(names, rotation=45, ha='right')
        ax1.yaxis.grid(True, linestyle='--', color='#94A3B8', alpha=0.5)
        plt.tight_layout()
        
        buf1 = io.BytesIO()
        plt.savefig(buf1, format='png', dpi=150)
        buf1.seek(0)
        charts['employee_performance_bar'] = buf1
        plt.close(fig1)

    # Chart 2: Total Work (Distance)
    if employee_list:
        dist_sorted = sorted(employee_list, key=lambda x: x['distance'], reverse=True)[:10]
        emp_labels = [item['name'][:10] for item in dist_sorted]
        emp_dist_vals = [item['distance'] for item in dist_sorted]
        
        fig2, ax2 = plt.subplots(figsize=(6, 4))
        sns.barplot(x=emp_labels, y=emp_dist_vals, ax=ax2, palette="Blues_d", hue=emp_labels, legend=False)
        plt.xticks(rotation=45, ha="right")
        plt.ylabel('Distance (km)')
        plt.title('Top 10 Employees by Distance Traveled')
        plt.tight_layout()
        
        buf2 = io.BytesIO()
        plt.savefig(buf2, format='png', dpi=150)
        buf2.seek(0)
        charts['employee_distance_bar'] = buf2
        plt.close(fig2)

    # Chart 3: Workflow Compliance Pipeline
    if total_meetings > 0:
        fig3, ax3 = plt.subplots(figsize=(6, 4))
        
        stages = ['Scheduled', 'Completed', 'MOMs Filed']
        counts = [total_meetings, completed_meetings, total_moms_submitted]
        colors = ['#94A3B8', '#1db1e2', '#10B981']
        
        bars = ax3.bar(stages, counts, color=colors, width=0.5)
        
        ax3.set_ylabel('Volume')
        ax3.set_ylim(0, max(counts + [10]) * 1.3)
        ax3.yaxis.grid(True, linestyle='--', color='#94A3B8', alpha=0.5)
        
        # Add values and percentages above bars
        for i, bar in enumerate(bars):
            height = bar.get_height()
            pct = (height / total_meetings) * 100 if total_meetings else 0
            ax3.text(bar.get_x() + bar.get_width()/2., height + max(counts)*0.02,
                     f'{int(height)}\n({pct:.1f}%)',
                     ha='center', va='bottom', fontsize=9, fontweight='bold', color='#334155')
                     
        plt.tight_layout()
        
        buf3 = io.BytesIO()
        plt.savefig(buf3, format='png', dpi=150, bbox_inches='tight')
        buf3.seek(0)
        charts['meeting_status_pie'] = buf3
        plt.close(fig3)

    # Chart 4: Fuel Cost by Employee
    if employee_list:
        cost_sorted = sorted(employee_list, key=lambda x: x['fuel_cost'], reverse=True)[:10]
        emp_labels_c = [item['name'][:10] for item in cost_sorted]
        emp_cost_vals = [item['fuel_cost'] for item in cost_sorted]
        
        fig4, ax4 = plt.subplots(figsize=(6, 4))
        sns.barplot(x=emp_labels_c, y=emp_cost_vals, ax=ax4, palette="Oranges_d", hue=emp_labels_c, legend=False)
        plt.xticks(rotation=45, ha="right")
        plt.ylabel('Fuel Cost (Rs)')
        plt.title('Top 10 Employees by Fuel Cost')
        plt.tight_layout()
        
        buf4 = io.BytesIO()
        plt.savefig(buf4, format='png', dpi=150)
        buf4.seek(0)
        charts['employee_fuel_bar'] = buf4
        plt.close(fig4)

    # 4. Daily Trend Data & Charts
    daily_stats = {}
    for m in meetings:
        d = m.created_at.date()
        if d not in daily_stats: daily_stats[d] = {"visits": 0, "meetings": 0, "attendance": set()}
        daily_stats[d]['meetings'] += 1
        daily_stats[d]['attendance'].add(m.employee_id)
        
    for v in visits:
        d = v.check_in_time.date()
        if d not in daily_stats: daily_stats[d] = {"visits": 0, "meetings": 0, "attendance": set()}
        daily_stats[d]['visits'] += 1
        daily_stats[d]['attendance'].add(v.employee_id)
        
    if daily_stats:
        sorted_days = sorted(daily_stats.keys())[-7:] # Last 7 active days
        day_labels = [d.strftime('%d %b') for d in sorted_days] # e.g. "25 Jun" prevents backward looping
        
        visit_counts = [daily_stats[d]['visits'] for d in sorted_days]
        meeting_counts = [daily_stats[d]['meetings'] for d in sorted_days]
        
        total_emp_count = len(emp_stats) if len(emp_stats) > 0 else 1
        attendance_rates = [(len(daily_stats[d]['attendance']) / total_emp_count) * 100 for d in sorted_days]
        
        # Chart 5: Field Activity Trend (Visits vs Meetings)
        fig5, ax5 = plt.subplots(figsize=(6, 4))
        ax5.plot(day_labels, visit_counts, marker='o', color='#1db1e2', linewidth=2, label='Ad-Hoc Visits')
        ax5.plot(day_labels, meeting_counts, marker='s', color='#6366F1', linewidth=2, label='Meetings')
        
        max_y = max(max(visit_counts + [0]), max(meeting_counts + [0]))
        ax5.set_ylim(0, max_y * 1.2 + 2)
        ax5.set_ylabel('Activity Count')
        ax5.yaxis.grid(True, linestyle='--', color='#94A3B8', alpha=0.5)
        ax5.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        buf5 = io.BytesIO()
        plt.savefig(buf5, format='png', dpi=150)
        buf5.seek(0)
        charts['visit_trend_line'] = buf5
        plt.close(fig5)
        
        # Chart 6: Attendance Trend (%)
        fig6, ax6 = plt.subplots(figsize=(6, 4))
        ax6.plot(day_labels, attendance_rates, marker='o', color='#10B981', linewidth=2)
        ax6.set_ylim(0, 110)
        ax6.set_ylabel('Workforce Active (%)')
        ax6.yaxis.grid(True, linestyle='--', color='#94A3B8', alpha=0.5)
        plt.xticks(rotation=45)
        plt.tight_layout()
        buf6 = io.BytesIO()
        plt.savefig(buf6, format='png', dpi=150)
        buf6.seek(0)
        charts['attendance_trend_line'] = buf6
        plt.close(fig6)

    # 5. Fetch and Group Activities by Employee
    moms = meetings.exclude(report_data__isnull=True).exclude(report_data={})
    site_visits = visits.exclude(report_data__isnull=True).exclude(report_data={})

    timeline = defaultdict(list)

    for mom in moms:
        emp_name = mom.employee.username
        timeline[emp_name].append({
            "type": "MOM",
            "time": mom.created_at,
            "date_str": mom.created_at.strftime("%Y-%m-%d"),
            "title": mom.meeting_title,
            "client": mom.client_name,
            "data": mom.report_data
        })

    for sv in site_visits:
        emp_name = sv.employee.username
        site_name = sv.site.name if hasattr(sv, 'site') and sv.site else "Unknown Site"
        timeline[emp_name].append({
            "type": "SITE VISIT",
            "time": sv.check_in_time,
            "date_str": sv.check_in_time.strftime("%Y-%m-%d"),
            "title": site_name,
            "client": site_name,
            "data": sv.report_data
        })

    # Sort each employee's activities chronologically
    for emp_name in timeline:
        timeline[emp_name].sort(key=lambda x: x['time'])

    data = {
        "period": {"start": start_date.strftime("%Y-%m-%d"), "end": end_date.strftime("%Y-%m-%d")},
        "metrics": {
            "total_meetings": total_meetings,
            "completed_meetings": completed_meetings,
            "missed_meetings": missed_meetings,
            "distance_km": distance_sum,
            "fuel_cost": fuel_cost_sum,
            "moms_submitted": total_moms_submitted,
            "site_visits": total_site_visits
        },
        "employee_stats": employee_list,
        "charts": charts,
        "timeline": dict(timeline)
    }
    return data
