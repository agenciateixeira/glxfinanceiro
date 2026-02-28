-- =====================================================
-- 03 - FUNCTION PARA ATUALIZAR STATUS DAS METAS
-- =====================================================
-- Descrição: Atualiza status da meta quando atingir o valor alvo
-- Ordem: Execute após criar tabela de goals
-- =====================================================

-- Function para atualizar status da meta
CREATE OR REPLACE FUNCTION public.update_goal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se atingiu ou ultrapassou a meta
  IF NEW.current_amount >= NEW.target_amount AND NEW.status = 'active' THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;

  -- Se era completed mas diminuiu o valor
  IF NEW.current_amount < NEW.target_amount AND NEW.status = 'completed' THEN
    NEW.status = 'active';
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_goal_status() IS 'Atualiza automaticamente o status da meta baseado no valor atual';

-- Trigger na tabela goals
CREATE TRIGGER check_goal_completion
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  WHEN (OLD.current_amount IS DISTINCT FROM NEW.current_amount)
  EXECUTE FUNCTION public.update_goal_status();
