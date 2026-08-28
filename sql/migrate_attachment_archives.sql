-- 已有数据库执行此迁移；新数据库可直接执行 sql/init.sql。
CREATE TABLE IF NOT EXISTS attachment_archives (
  uuid CHAR(36) NOT NULL PRIMARY KEY COMMENT '归档记录唯一标识',
  user_uuid CHAR(36) NOT NULL COMMENT '所属用户 UUID',
  client_project_uuid CHAR(36) NOT NULL COMMENT '前端项目 UUID',
  client_attachment_uuid VARCHAR(128) NOT NULL COMMENT '前端附件 UUID',
  object_storage_path VARCHAR(512) NULL COMMENT '对象存储文件路径，例如 COS Key',
  file_name VARCHAR(255) NOT NULL COMMENT '附件原始文件名',
  file_size VARCHAR(32) NOT NULL COMMENT '附件大小，保留展示值，例如 1.2 MB',
  analyzed_file_content LONGTEXT NOT NULL COMMENT '附件解析后的文本内容',
  ai_dashboard_feedback LONGTEXT NULL COMMENT 'AI 仪表盘分析结果 JSON',
  ai_report_stream_feedback LONGTEXT NULL COMMENT 'AI 对话流反馈及历史消息 JSON',
  optimization_plan_questions_answers LONGTEXT NULL COMMENT '优化商业计划的问题与回答 JSON',
  ai_business_plan_v2_content LONGTEXT NULL COMMENT 'AI 生成的商业计划 v2 JSON',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '首次归档时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间',
  UNIQUE KEY uq_attachment_archives_user_project_attachment
    (user_uuid, client_project_uuid, client_attachment_uuid),
  CONSTRAINT fk_attachment_archives_user FOREIGN KEY (user_uuid) REFERENCES users(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件及 AI 产物归档表，仅写入备份，当前页面不读取';

-- 如果表已经存在，补齐或更新字段注释。
ALTER TABLE attachment_archives
  MODIFY COLUMN uuid CHAR(36) NOT NULL COMMENT '归档记录唯一标识',
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
