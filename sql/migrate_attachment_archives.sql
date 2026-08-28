-- 仅用于已有旧版 attachment_archives 表；新数据库请执行 sql/init.sql。

-- 如果表已经存在：将主键切换为数据库自增 ID，并允许同一个 UUID 对应多条归档记录。
ALTER TABLE attachment_archives
  DROP PRIMARY KEY,
  DROP INDEX uq_attachment_archives_user_project_attachment,
  ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
  MODIFY COLUMN uuid CHAR(36) NOT NULL COMMENT '业务 UUID，可对应多条归档记录',
  MODIFY COLUMN user_uuid CHAR(36) NOT NULL COMMENT '所属用户 UUID',
  MODIFY COLUMN client_project_uuid CHAR(36) NOT NULL COMMENT '前端项目 UUID',
  MODIFY COLUMN client_attachment_uuid VARCHAR(128) NOT NULL COMMENT '前端附件 UUID',
  MODIFY COLUMN object_storage_path VARCHAR(512) NULL COMMENT '对象存储文件路径，例如 COS Key',
  MODIFY COLUMN file_name VARCHAR(255) NOT NULL COMMENT '附件原始文件名',
  MODIFY COLUMN file_size VARCHAR(32) NOT NULL COMMENT '附件大小，保留展示值，例如 1.2 MB',
  MODIFY COLUMN analyzed_file_content LONGTEXT NOT NULL COMMENT '附件解析后的文本内容',
  MODIFY COLUMN ai_dashboard_feedback LONGTEXT NULL COMMENT 'AI 仪表盘分析结果 JSON',
  MODIFY COLUMN ai_report_stream_feedback LONGTEXT NULL COMMENT 'AI 对话流反馈及历史消息 JSON',
  MODIFY COLUMN optimization_plan_questions_answers LONGTEXT NULL COMMENT '优化商业计划的问题与回答 JSON',
  MODIFY COLUMN ai_business_plan_v2_content LONGTEXT NULL COMMENT 'AI 生成的商业计划 v2 JSON',
  MODIFY COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '首次归档时间',
  MODIFY COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间',
  COMMENT='附件及 AI 产物归档表，仅写入备份，当前页面不读取';
