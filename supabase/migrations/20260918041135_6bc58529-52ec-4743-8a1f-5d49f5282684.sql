ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

DROP FUNCTION IF EXISTS public.get_leaderboard(text);

CREATE OR REPLACE FUNCTION public.get_leaderboard(_country text DEFAULT NULL::text)
RETURNS TABLE(
  user_id uuid,
  is_public boolean,
  full_name text,
  high_school text,
  city text,
  grade_level text,
  target_major text,
  target_countries text[],
  gpa_unweighted numeric,
  sat_score integer,
  act_score integer,
  unt_score integer,
  nuet_score integer,
  holistic_score integer,
  summary text,
  countries jsonb,
  strengths jsonb,
  evaluated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.portfolio_public,
    p.full_name,
    p.high_school,
    p.city,
    CASE WHEN p.portfolio_public THEN p.grade_level ELSE NULL END,
    CASE WHEN p.portfolio_public THEN p.target_major ELSE NULL END,
    CASE WHEN p.portfolio_public THEN p.target_countries ELSE '{}'::text[] END,
    CASE WHEN p.portfolio_public THEN p.gpa_unweighted ELSE NULL END,
    CASE WHEN p.portfolio_public THEN p.sat_score ELSE NULL END,
    CASE WHEN p.portfolio_public THEN p.act_score ELSE NULL END,
    CASE WHEN p.portfolio_public THEN p.unt_score ELSE NULL END,
    CASE WHEN p.portfolio_public THEN p.nuet_score ELSE NULL END,
    e.holistic_score,
    CASE WHEN p.portfolio_public THEN e.summary ELSE NULL END,
    CASE WHEN p.portfolio_public THEN e.countries ELSE '[]'::jsonb END,
    CASE WHEN p.portfolio_public THEN e.strengths ELSE '[]'::jsonb END,
    e.created_at
  FROM public.profiles p
  JOIN LATERAL (
    SELECT ev.holistic_score, ev.summary, ev.countries, ev.strengths, ev.created_at
    FROM public.ai_evaluations ev
    WHERE ev.user_id = p.id AND ev.holistic_score IS NOT NULL
    ORDER BY ev.created_at DESC
    LIMIT 1
  ) e ON true
  WHERE _country IS NULL OR _country = ANY (p.target_countries)
  ORDER BY e.holistic_score DESC NULLS LAST
  LIMIT 50;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text) TO authenticated;