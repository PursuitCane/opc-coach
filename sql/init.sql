-- OPC 军师数据库初始化（MySQL 8+）
-- 请先创建数据库，并在该数据库中执行本文件。

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '数据库自增主键',
  uuid CHAR(36) NOT NULL COMMENT '用户业务 UUID',
  email VARCHAR(254) NOT NULL COMMENT '用户邮箱',
  bpti_image_no TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'BPTI 海报图片编号，1-16',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  last_login_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后登录时间',
  UNIQUE KEY uq_users_uuid (uuid),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE IF NOT EXISTS email_login_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '数据库自增主键',
  email VARCHAR(254) NOT NULL COMMENT '接收验证码的邮箱',
  code_hash VARCHAR(64) NOT NULL COMMENT '验证码哈希',
  expires_at DATETIME(3) NOT NULL COMMENT '验证码失效时间',
  attempts INTEGER NOT NULL DEFAULT 0 COMMENT '已尝试次数',
  sent_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '发送时间',
  deleted_at DATETIME(3) NULL COMMENT '逻辑删除时间',
  UNIQUE KEY uq_email_login_codes_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮箱登录验证码表';

-- 附件归档：一条附件一条记录，当前前端只写入、不从此表读取。
CREATE TABLE IF NOT EXISTS attachment_archives (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '归档记录自增 ID',
  uuid CHAR(36) NOT NULL COMMENT '所属用户 UUID',
  client_project_uuid CHAR(36) NOT NULL COMMENT '前端项目 UUID',
  project_name VARCHAR(255) NOT NULL COMMENT '项目名称',
  client_attachment_uuid VARCHAR(128) NOT NULL COMMENT '前端附件 UUID',
  object_storage_path VARCHAR(512) NULL COMMENT '对象存储文件路径，例如 COS Key',
  file_name VARCHAR(255) NOT NULL COMMENT '附件原始文件名',
  file_size VARCHAR(32) NOT NULL COMMENT '附件大小，保留展示值，例如 1.2 MB',
  analyzed_file_content LONGTEXT NOT NULL COMMENT '附件解析后的文本内容',
  ai_dashboard_feedback LONGTEXT NULL COMMENT 'AI 仪表盘分析结果 JSON',
  plan_questions_answers_json LONGTEXT NULL COMMENT '优化商业计划题目与答案 JSON',
  ai_business_plan_v2_content LONGTEXT NULL COMMENT 'AI 生成的商业计划 v2 JSON',
  analysis_version INT UNSIGNED NULL COMMENT '项目第几次商业分析',
  analyzed_at DATETIME(3) NULL COMMENT '本次商业分析完成时间',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '首次归档时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间',
  CONSTRAINT fk_attachment_archives_user FOREIGN KEY (uuid) REFERENCES users(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件及 AI 产物归档表，仅写入备份，当前页面不读取';

-- 项目交互归档：只保存对话消息，每次归档新增一条，不参与前端展示。
CREATE TABLE IF NOT EXISTS project_conversation_archives (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '数据库自增主键',
  uuid CHAR(36) NOT NULL COMMENT '所属用户 UUID',
  client_project_uuid CHAR(36) NOT NULL COMMENT '前端项目 UUID',
  chat_messages_json LONGTEXT NULL COMMENT '对话 Tab 的消息快照 JSON',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '首次归档时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间',
  CONSTRAINT fk_project_conversation_archives_user FOREIGN KEY (uuid) REFERENCES users(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目对话归档表，每次归档新增一条，仅写入备份';

-- 成长记录归档：每次重新生成都新增一条，不覆盖历史记录。
CREATE TABLE IF NOT EXISTS project_diary_archives (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '数据库自增主键',
  uuid CHAR(36) NOT NULL COMMENT '所属用户 UUID',
  client_project_uuid CHAR(36) NOT NULL COMMENT '前端项目 UUID',
  diary_entry_json LONGTEXT NOT NULL COMMENT '本次生成的日记条目 JSON',
  coach_line TEXT NULL COMMENT '本次生成的教练一句话',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '生成归档时间',
  CONSTRAINT fk_project_diary_archives_user FOREIGN KEY (uuid) REFERENCES users(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成长记录及教练一句话归档表，仅写入备份，当前页面不读取';
