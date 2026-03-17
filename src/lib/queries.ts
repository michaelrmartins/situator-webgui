export const LIVE_EVENTS_QUERY = `
  select 
    person."Id" as "PersonId",
    person."Name", 
    d."Name" as "Door", 
    z."Name" as "Zone", 
    a."Time", 
    person."Document", 
    person."Document" as "Type", 
    person."PersonType",
    person."PersonImage",
    to_hex(aCard."CardNumber") as "Card RFID", 
    a."Authorized"
  from 
    "AccessTransaction" a 
    LEFT JOIN "Person" person on person."Id" = a."PersonId" 
    LEFT JOIN "Door" d on d."ServerId" = a."ServerId" 
    LEFT JOIN "Zone" z on z."Id" = a."ZoneId" 
    left join "PersonPin" pPin on Person."Id" = pPin."PersonId" 
    left join "AccessCard" aCard on pPin."AccessCardId" = aCard."Id" 
  where
    ($1::text = '' OR 
     person."Name" ILIKE '%' || $1::text || '%' OR 
     person."Document" ILIKE '%' || $1::text || '%' OR 
     to_hex(aCard."CardNumber") ILIKE '%' || $1::text || '%')
  order by 
    a."Time" desc 
  limit $2 offset $3
`;

// Helper block for daily filtering (since time in Situator might be Unix timestamp in ms)
// Example assumes "Time" is milliseconds since epoch.
export const DOORS_TODAY_QUERY = `
  select 
    d."Name" as "Door",
    COUNT(*) as "TotalCount",
    SUM(CASE WHEN a."Authorized" = true THEN 1 ELSE 0 END) as "AuthorizedCount",
    SUM(CASE WHEN a."Authorized" = false THEN 1 ELSE 0 END) as "DeniedCount"
  from 
    "AccessTransaction" a
    LEFT JOIN "Door" d on d."ServerId" = a."ServerId"
  where
    a."Time" >= to_timestamp($1::numeric / 1000.0) and a."Time" <= to_timestamp($2::numeric / 1000.0)
  group by 
    d."Name"
  order by
    "TotalCount" desc
`;

export const DAILY_ACCESS_QUERY = `
  select 
    to_char(a."Time", 'YYYY-MM-DD') as "Day",
    COUNT(*) as "AccessCount",
    COUNT(DISTINCT a."PersonId") as "UniquePeople"
  from 
    "AccessTransaction" a
  where
    a."Time" >= to_timestamp($1::numeric / 1000.0) and a."Time" <= to_timestamp($2::numeric / 1000.0)
  group by 
    "Day"
  order by
    "Day" asc
`;

export const HOURLY_ACCESS_QUERY = `
  select 
    EXTRACT(HOUR FROM a."Time") as "Hour",
    COUNT(*) as "AccessCount",
    COUNT(DISTINCT a."PersonId") as "UniquePeople"
  from 
    "AccessTransaction" a
  where
    a."Time" >= to_timestamp($1::numeric / 1000.0) and a."Time" <= to_timestamp($2::numeric / 1000.0)
  group by 
    "Hour"
  order by
    "Hour" asc
`;

export const AUTHORIZATION_STATS_QUERY = `
  select 
    a."Authorized",
    COUNT(*) as "Count"
  from 
    "AccessTransaction" a
  where
    a."Time" >= to_timestamp($1::numeric / 1000.0) and a."Time" <= to_timestamp($2::numeric / 1000.0)
  group by 
    a."Authorized"
`;

export const RFID_STATS_QUERY = `
  select 
    case when aCard."CardNumber" is not null then 'Present' else 'Absent' end as "RFIDStatus",
    count(*) as "Count"
  from 
    "AccessTransaction" a 
    LEFT JOIN "Person" person on person."Id" = a."PersonId" 
    left join "PersonPin" pPin on Person."Id" = pPin."PersonId" 
    left join "AccessCard" aCard on pPin."AccessCardId" = aCard."Id" 
  where
    a."Time" >= to_timestamp($1::numeric / 1000.0) and a."Time" <= to_timestamp($2::numeric / 1000.0)
  group by 
    "RFIDStatus"
`;

export const PERSON_HISTORY_QUERY = `
  select 
    person."Id" as "PersonId",
    person."Name", 
    d."Name" as "Door", 
    z."Name" as "Zone", 
    a."Time", 
    person."Document", 
    person."Document" as "Type", 
    person."PersonType",
    person."PersonImage",
    to_hex(aCard."CardNumber") as "Card RFID", 
    a."Authorized"
  from 
    "AccessTransaction" a 
    LEFT JOIN "Person" person on person."Id" = a."PersonId" 
    LEFT JOIN "Door" d on d."ServerId" = a."ServerId" 
    LEFT JOIN "Zone" z on z."Id" = a."ZoneId" 
    left join "PersonPin" pPin on Person."Id" = pPin."PersonId" 
    left join "AccessCard" aCard on pPin."AccessCardId" = aCard."Id" 
  where 
    person."Id" = $1
  order by 
    a."Time" desc 
  limit $2
`;

export const NO_RFID_ACCESS_QUERY = `
  select distinct
    person."Id" as "PersonId",
    person."Name",
    person."Document" as "Matricula",
    person."PersonImage",
    person."PersonType"
  from 
    "AccessTransaction" a 
    JOIN "Person" person on person."Id" = a."PersonId" 
    left join "PersonPin" pPin on Person."Id" = pPin."PersonId" 
    left join "AccessCard" aCard on pPin."AccessCardId" = aCard."Id" 
  where
    a."Time" >= to_timestamp($1::numeric / 1000.0) and a."Time" <= to_timestamp($2::numeric / 1000.0)
    and aCard."CardNumber" is null
    and person."Name" is not null
  order by 
    person."Name" asc
`;
