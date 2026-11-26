import { useEffect, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  LogIn,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type {
  Connection,
  Provider,
  AccountModel,
  AccountLoginInput,
} from "@uai/contracts";
import { bridge, errorText, native } from "../bridge";
import Modal from "./Modal";

type Props = {
  connections: Connection[];
  onConnected: (id: string) => Promise<void>;
  onChanged: () => Promise<void>;
  onApi: (provider: Provider) => void;
  onNotice: (message: string) => void;
};
export default function AccountConnections({
  connections,
  onConnected,
  onChanged,
  onApi,
  onNotice,
}: Props) {
  const [login, setLogin] = useState<{
    provider: "openai" | "google";
    connection?: Connection;
  } | null>(null);
  const [models, setModels] = useState<Connection | null>(null);
  const [remove, setRemove] = useState<Connection | null>(null);
  const [removing, setRemoving] = useState(false);
  const saved = connections.filter(
    (c) => c.auth_mode && c.auth_mode !== "api_key",
  );
  const help = (provider: Provider) =>
    void bridge.accountHelp(provider).catch((e) => onNotice(errorText(e)));
  return (
    <section
      className="account-connections"
      aria-label="Kết nối bằng tài khoản"
    >
      <div className="account-section-title">
        <div>
          <h2>Kết nối bằng tài khoản</h2>
          <p>
            Đăng nhập trong trình duyệt chính thức. Ứng dụng không nhận mật khẩu
            hoặc cookie của bạn.
          </p>
        </div>
        <span>
          <ShieldCheck size={13} />
          OAuth + PKCE
        </span>
      </div>
      <div className="account-provider-grid">
        <div className="account-provider">
          <div className="account-provider-name">
            <span className="provider-badge openai">
              <UserRound size={17} />
            </span>
            <h3>ChatGPT</h3>
            <span className="account-kind">Tài khoản</span>
          </div>
          <p>
            Dùng Sign in with ChatGPT khi tài khoản và ứng dụng được cấp quyền.
            Không cần nhập API Key.
          </p>
          <button
            className="account-login-button"
            disabled={!native}
            onClick={() => setLogin({ provider: "openai" })}
          >
            <LogIn size={15} />
            Continue with ChatGPT
          </button>
          <button className="text-button" onClick={() => help("openai")}>
            Điều kiện hỗ trợ
            <ExternalLink size={12} />
          </button>
        </div>
        <div className="account-provider">
          <div className="account-provider-name">
            <span className="provider-badge anthropic">A</span>
            <h3>Claude</h3>
            <span className="account-kind limited">API / Platform</span>
          </div>
          <p>
            Chưa có quyền cấp đăng nhập claude.ai trong app này. Dùng API Key;
            OAuth Claude Platform cần ứng dụng được phê duyệt.
          </p>
          <button
            className="secondary-button"
            onClick={() => onApi("anthropic")}
          >
            <KeyRound size={15} />
            Kết nối Claude API
          </button>
          <button className="text-button" onClick={() => help("anthropic")}>
            Xem phương thức chính thức
            <ExternalLink size={12} />
          </button>
        </div>
        <div className="account-provider">
          <div className="account-provider-name">
            <span className="provider-badge google">
              <UserRound size={17} />
            </span>
            <h3>Gemini</h3>
            <span className="account-kind">Google OAuth</span>
          </div>
          <p>
            Đăng nhập Google cho Gemini API. Cần OAuth Client ID Desktop và
            Google Cloud Project; không dùng hạn mức gói Gemini cá nhân.
          </p>
          <button
            className="account-login-button google-login"
            disabled={!native}
            onClick={() => setLogin({ provider: "google" })}
          >
            <LogIn size={15} />
            Đăng nhập với Google
          </button>
          <button className="text-button" onClick={() => help("google")}>
            Hướng dẫn cấu hình Google
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
      {!native && (
        <p className="account-preview-note">
          Đăng nhập tài khoản chỉ hoạt động trong bản desktop. Bản web không
          nhận thông tin xác thực.
        </p>
      )}
      {saved.length > 0 && (
        <div className="account-saved">
          <h3>Tài khoản trên thiết bị này</h3>
          {saved.map((c) => (
            <div className="account-saved-row" key={c.id}>
              <div className="account-avatar">
                <UserRound size={19} />
              </div>
              <div className="account-identity">
                <strong>{c.name}</strong>
                <span>
                  {c.default_model ?? "Chưa chọn model"} ·{" "}
                  {c.has_key && !c.needs_reauth
                    ? "Phiên đã lưu và có thể làm mới"
                    : "Cần đăng nhập lại trên máy này"}
                </span>
                <small>
                  {c.auth_mode === "chatgpt"
                    ? "ChatGPT OAuth"
                    : "Google OAuth · Gemini API"}
                </small>
              </div>
              <button
                className="secondary-button"
                onClick={() => setModels(c)}
                disabled={!c.has_key || c.needs_reauth}
              >
                <Settings2 size={14} />
                Model
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  setLogin({
                    provider: c.provider as "openai" | "google",
                    connection: c,
                  })
                }
              >
                <RefreshCw size={14} />
                Đăng nhập lại
              </button>
              <button
                className="icon-button danger"
                aria-label={`Ngắt kết nối ${c.name}`}
                onClick={() => setRemove(c)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {login && (
        <AccountLoginModal
          provider={login.provider}
          connection={login.connection}
          onDone={async (id) => {
            await onConnected(id);
            setLogin(null);
            onNotice(
              "Đã xác minh phiên tài khoản và tải danh sách model. Quyền sinh phản hồi được kiểm khi gửi.",
            );
          }}
          onClose={() => {
            setLogin(null);
            void onChanged();
          }}
        />
      )}
      {models && (
        <AccountModelModal
          connection={models}
          onClose={() => setModels(null)}
          onSave={async (model) => {
            try {
              await bridge.selectAccountModel(models.id, model);
              await onChanged();
              setModels(null);
            } catch (e) {
              onNotice(errorText(e));
            }
          }}
        />
      )}
      {remove && (
        <Modal
          title="Ngắt kết nối tài khoản"
          onClose={() => {
            if (!removing) setRemove(null);
          }}
        >
          <p className="confirm-body">
            App sẽ thử thu hồi phiên tại nhà cung cấp, rồi xóa khóa và token
            trên thiết bị này. Lịch sử chat được giữ nguyên. Nếu không có mạng,
            bạn có thể cần thu hồi quyền trong trang tài khoản của nhà cung cấp.
          </p>
          <div className="modal-footer">
            <button
              className="secondary-button"
              disabled={removing}
              onClick={() => setRemove(null)}
            >
              Hủy
            </button>
            <button
              className="danger-button"
              disabled={removing}
              onClick={async () => {
                setRemoving(true);
                try {
                  const message = await bridge.deleteConnection(remove.id);
                  await onChanged();
                  setRemove(null);
                  onNotice(message);
                } catch (e) {
                  onNotice(errorText(e));
                } finally {
                  setRemoving(false);
                }
              }}
            >
              {removing ? "Đang ngắt…" : "Ngắt kết nối"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
function AccountLoginModal({
  provider,
  connection,
  onDone,
  onClose,
}: {
  provider: "openai" | "google";
  connection?: Connection;
  onDone: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [clientId, setClientId] = useState(""),
    [secret, setSecret] = useState(""),
    [project, setProject] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    if (provider === "google" && !connection)
      void bridge
        .accountConfig()
        .then((c) => {
          if (mounted.current) {
            setClientId(c.google_client_id ?? "");
            setProject(c.google_quota_project ?? "");
          }
        })
        .catch((e) => setError(errorText(e)));
    return () => {
      mounted.current = false;
    };
  }, []);
  const close = () => {
    if (busy) void bridge.cancelAccountLogin().catch(() => {});
    onClose();
  };
  const submit = async () => {
    setError("");
    setBusy(true);
    const input: AccountLoginInput = {
      provider,
      connection_id: connection?.id,
      ...(provider === "google"
        ? {
            client_id: clientId || undefined,
            client_secret: secret || undefined,
            quota_project: project || undefined,
          }
        : {}),
    };
    setSecret("");
    try {
      const result = await bridge.connectAccount(input);
      if (mounted.current) await onDone(result.connection_id);
    } catch (e) {
      if (mounted.current) setError(errorText(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <Modal
      title={
        provider === "openai"
          ? "Sign in with ChatGPT"
          : "Đăng nhập Google cho Gemini API"
      }
      subtitle="Mật khẩu chỉ được nhập trên trang của nhà cung cấp trong trình duyệt hệ thống."
      onClose={close}
    >
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {provider === "openai" ? (
          <div className="oauth-explanation">
            <p>
              Luồng Sign in with ChatGPT dành cho bản mã nguồn mở hoặc ứng dụng
              được OpenAI chấp thuận. Hạn mức và model phụ thuộc tài khoản, gói
              dịch vụ và quyền đã cấp.
            </p>
            <p>
              Không nhập cookie hoặc mật khẩu ChatGPT vào app. App không đọc
              lịch sử ChatGPT của bạn.
            </p>
          </div>
        ) : (
          <>
            <div className="oauth-explanation">
              <p>
                Đây là quyền Gemini API theo Google Cloud Project, không phải
                đăng nhập để dùng hạn mức Gemini Pro/Ultra cá nhân. Google sẽ
                hiển thị các quyền được yêu cầu trước khi bạn chấp thuận.
              </p>
            </div>
            <label>
              OAuth Client ID loại Desktop app
              <input
                disabled={busy || !native}
                required={!connection}
                value={clientId}
                maxLength={256}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={
                  connection
                    ? "Để trống để dùng đăng ký đã lưu"
                    : "…apps.googleusercontent.com"
                }
              />
            </label>
            <label>
              Client secret của Desktop app nếu được cấp
              <input
                disabled={busy || !native}
                type="password"
                autoComplete="new-password"
                value={secret}
                maxLength={4096}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Để trống nếu đã cấu hình trên máy"
              />
            </label>
            <label>
              Google Cloud Project ID
              <input
                disabled={busy || !native}
                required={!connection}
                value={project}
                maxLength={63}
                onChange={(e) => setProject(e.target.value)}
                placeholder={
                  connection
                    ? "Để trống để dùng project đã lưu"
                    : "my-google-cloud-project"
                }
              />
            </label>
          </>
        )}
        <p className="form-note">
          <ShieldCheck size={16} />
          Token được mã hóa trên máy; khóa mã hóa giữ trong Keychain/Credential
          Manager. Token chỉ được chuyển qua Gateway localhost.
        </p>
        {busy && (
          <div className="oauth-progress" role="status">
            <LoaderCircle size={18} className="spin" />
            <span>
              Hoàn tất đăng nhập trong trình duyệt vừa mở. App đang chờ xác minh
              danh tính và quyền truy cập…
            </span>
          </div>
        )}
        {error && (
          <div className="oauth-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-footer">
          <button className="secondary-button" type="button" onClick={close}>
            {busy ? "Hủy đăng nhập" : "Đóng"}
          </button>
          <button
            className="primary-button"
            disabled={busy || !native}
            type="submit"
          >
            <LogIn size={15} />
            {busy
              ? "Đang chờ…"
              : provider === "openai"
                ? "Continue with ChatGPT"
                : "Tiếp tục với Google"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function AccountModelModal({
  connection,
  onClose,
  onSave,
}: {
  connection: Connection;
  onClose: () => void;
  onSave: (model: string) => Promise<void>;
}) {
  const [choices, setChoices] = useState<AccountModel[]>([]),
    [selected, setSelected] = useState(connection.default_model ?? ""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    void bridge
      .accountModels(connection.id)
      .then((data) => {
        if (alive) {
          setChoices(data);
          if (!data.some((m) => m.id === selected))
            setSelected(data[0]?.id ?? "");
        }
      })
      .catch((e) => {
        if (alive) setError(errorText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [connection.id]);
  return (
    <Modal
      title="Model của tài khoản"
      subtitle={connection.name}
      onClose={onClose}
    >
      {loading ? (
        <div className="oauth-progress">
          <LoaderCircle size={18} className="spin" />
          Đang tải model của tài khoản đã xác thực…
        </div>
      ) : error ? (
        <div role="alert" className="oauth-error">
          {error}
        </div>
      ) : (
        <label>
          Model dùng cho các lượt tiếp theo
          <select
            aria-label="Model của tài khoản"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {choices.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.id}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="form-note">
        Danh sách model không bảo đảm mọi yêu cầu đều được chấp nhận. Hạn mức và
        quyền thực tế được kiểm khi gửi.
      </p>
      <div className="modal-footer">
        <button className="secondary-button" onClick={onClose}>
          Đóng
        </button>
        <button
          disabled={loading || !!error || !selected || saving}
          className="primary-button"
          onClick={async () => {
            setSaving(true);
            await onSave(selected);
            setSaving(false);
          }}
        >
          <Check size={15} />
          Chọn model
        </button>
      </div>
    </Modal>
  );
}
