---
banner: "![[Banner.png]]"
cssclasses:
  - home-dashboard
tags:
  - dashboard
---
```dataviewjs
dv.view("90_System/92_Scripts/Dataview/homepage/info-headers")
```
---
> [!multi-column]
> 
>> [!blank]
>> ```dataviewjs
>> dv.view("90_System/92_Scripts/Dataview/homepage/schedule-callout")
>> ```
>
>> [!blank]
>>> [!multi-column]
>>>
>>>> [!blank|wide-5]
>>>> ```dataviewjs
>>>> dv.view("90_System/92_Scripts/Dataview/homepage/dashboard-calendar")
>>>> ```
>>
>> ```dataviewjs
>> dv.view("90_System/92_Scripts/Dataview/homepage/exercise-callout")
>> dv.view("90_System/92_Scripts/Dataview/homepage/cardio-callout")
>> ```
---
```dataviewjs
await dv.view("90_System/92_Scripts/Dataview/homepage/finance-quick-add");
```
